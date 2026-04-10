import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import { TEMPLATE_REGISTRY, getTemplate, validateTemplateData } from "./registry.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const BUILD_DIR  = path.join(__dirname, "build");

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Brak SUPABASE_URL lub SUPABASE_KEY.");
  return createClient(supabaseUrl, supabaseKey);
}

async function ensureBuildDir() {
  await fs.mkdir(BUILD_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
// EVALUATORS — funkcje uruchamiane WEWNĄTRZ Puppeteer (przeglądarka).
// Muszą być self-contained (bez domknięć na zewnętrzne zmienne).
// Klucze muszą odpowiadać nazwom szablonów w registry.js.
// ─────────────────────────────────────────────────────────────

const EVALUATORS = {

  "post": ({ postType, headline, subheadline, bodyPoints, date }) => {
    document.getElementById("postType").textContent    = postType || "POST";
    document.getElementById("headline").textContent    = headline || "";
    document.getElementById("subheadline").textContent = subheadline || "";
    document.getElementById("date").textContent        = date || "";
    const ul = document.getElementById("bodyPoints");
    ul.innerHTML = "";
    for (const point of (bodyPoints || [])) {
      const li = document.createElement("li");
      li.textContent = point;
      ul.appendChild(li);
    }
  },

  "carousel-slide": ({ index, title, body }) => {
    document.getElementById("slideIndex").textContent = String(index || 1);
    document.getElementById("slideTitle").textContent = title || "";
    document.getElementById("slideBody").textContent  = body  || "";
  },

  "story-hook": ({ postType, hookText }) => {
    document.getElementById("postType").textContent = postType || "PORADA";
    document.getElementById("hookText").textContent = hookText || "";
  },

  "story-value": ({ valueTitle, valuePoints }) => {
    document.getElementById("valueTitle").textContent = valueTitle || "";
    const ul = document.getElementById("valuePoints");
    ul.innerHTML = "";
    (valuePoints || []).forEach((point, i) => {
      const li  = document.createElement("li");
      const num = document.createElement("span");
      num.className   = "point-number";
      num.textContent = String(i + 1);
      const txt = document.createElement("span");
      txt.textContent = point;
      li.appendChild(num);
      li.appendChild(txt);
      ul.appendChild(li);
    });
  },

  "story-quote": ({ quote, author }) => {
    document.getElementById("quote").textContent  = quote  || "";
    const authorEl = document.getElementById("author");
    if (authorEl) authorEl.textContent = author || "";
  },

  "story-cta": ({ ctaMain, ctaSub, handle }) => {
    document.getElementById("ctaMain").textContent = ctaMain || "";
    const subEl    = document.getElementById("ctaSub");
    const handleEl = document.getElementById("handle");
    if (subEl    && ctaSub) subEl.textContent    = ctaSub;
    if (handleEl && handle) handleEl.textContent = handle;
  },

};

// ─────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────

async function renderTemplate({ templatePath, width, height, evaluateFn, args, outputDir }) {
  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const browser = await puppeteer.launch({
    headless: true,
    args: isCI
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : [],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(pathToFileURL(templatePath).toString(), { waitUntil: "networkidle0" });
    await page.evaluate(evaluateFn, args);

    const dir        = outputDir ?? os.tmpdir();
    const outputPath = path.join(dir, `ig-${randomUUID()}.png`);
    await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width, height } });
    return outputPath;
  } finally {
    await browser.close();
  }
}

async function uploadFileToStorage(localPath, targetPath, bucket = "instagram-posts") {
  const supabase  = getSupabaseClient();
  const fileBuffer = await fs.readFile(localPath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(targetPath, fileBuffer, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Upload do Supabase nieudany: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(targetPath);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// PUBLICZNE API
// ─────────────────────────────────────────────────────────────

/**
 * Generyczna funkcja renderowania — używa rejestru szablonów.
 * Waliduje dane przed renderem. Łatwo rozszerzalna o nowe szablony.
 *
 * @param {string} templateName  - klucz z registry.js (np. "post", "story-hook")
 * @param {object} data          - dane zgodne z kontraktem pól szablonu
 * @param {{ upload?: boolean, outputDir?: string, bucket?: string }} options
 */
export async function renderByTemplate(templateName, data, options = {}) {
  validateTemplateData(templateName, data);

  const tpl        = getTemplate(templateName);
  const evaluateFn = EVALUATORS[templateName];

  if (!evaluateFn) {
    throw new Error(
      `Brak evaluatora dla szablonu "${templateName}". Dodaj go do EVALUATORS w render.js.`,
    );
  }

  const templatePath = path.join(__dirname, "templates", tpl.file);
  const outputPath   = await renderTemplate({
    templatePath,
    width:      tpl.size.width,
    height:     tpl.size.height,
    outputDir:  options.outputDir,
    evaluateFn,
    args: data,
  });

  if (!options.upload) {
    return { templateName, localPath: outputPath, publicUrl: null };
  }

  const folder     = tpl.format === "story" ? "story" : templateName === "post" ? "posts" : "carousel";
  const targetPath = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.png`;
  const publicUrl  = await uploadFileToStorage(outputPath, targetPath, options.bucket);
  return { templateName, localPath: outputPath, publicUrl };
}

// ── Wygodne wrappery (zachowują stare API) ───────────────────

export async function renderPostImage(content, options = {}) {
  return renderByTemplate("post", content, options);
}

export async function renderCarouselSlideImage(slide, options = {}) {
  return renderByTemplate("carousel-slide", slide, options);
}

/**
 * @param {{ type: "hook"|"value"|"quote"|"cta", ...fields }} slide
 */
export async function renderStorySlideImage({ type, ...data }, options = {}) {
  return renderByTemplate(`story-${type}`, data, options);
}

// ─────────────────────────────────────────────────────────────
// SMOKE TEST
// ─────────────────────────────────────────────────────────────

async function runSmokeRender() {
  await ensureBuildDir();

  const cases = [
    ["post",           { postType: "TEST", headline: "Smoke test", subheadline: "Czy renderer działa?", bodyPoints: ["Punkt 1", "Punkt 2", "Punkt 3"] }],
    ["carousel-slide", { index: 1, title: "Slajd testowy", body: "Treść slajdu nr 1 — smoke test." }],
    ["story-hook",     { postType: "PORADA", hookText: "Czy tracisz czas na treści, które nikt nie ogląda?" }],
    ["story-value",    { valueTitle: "3 rzeczy które zmienią twój Instagram", valuePoints: ["Konsekwencja publikacji", "Hook w 3 sekundy", "Jasne CTA na końcu"] }],
    ["story-quote",    { quote: "Nie musisz być perfekcyjny, żeby zacząć — zacznij, żeby być lepszy.", author: "Inspirio" }],
    ["story-cta",      { ctaMain: "Zacznij tworzyć lepsze treści już dziś", handle: "@inspirio" }],
  ];

  const results = {};
  for (const [templateName, data] of cases) {
    console.log(`🖼  Rendering ${templateName}...`);
    results[templateName] = await renderByTemplate(templateName, data, { upload: false, outputDir: BUILD_DIR });
  }

  console.log(JSON.stringify(results, null, 2));
  console.log(`\n✅ Pliki zapisane w: ${BUILD_DIR}`);
}

if (process.argv.includes("--smoke")) {
  runSmokeRender().catch((err) => { console.error(err); process.exitCode = 1; });
}

