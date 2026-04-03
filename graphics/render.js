import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POST_TEMPLATE_PATH = path.join(__dirname, "templates", "post.html");
const CAROUSEL_TEMPLATE_PATH = path.join(__dirname, "templates", "carousel-slide.html");

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Brak SUPABASE_URL lub SUPABASE_KEY.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

async function renderTemplate({ templatePath, width, height, evaluateFn, args }) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(pathToFileURL(templatePath).toString(), { waitUntil: "networkidle0" });
    await page.evaluate(evaluateFn, args);

    const outputPath = path.join(os.tmpdir(), `ig-${randomUUID()}.png`);
    await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width, height } });
    return outputPath;
  } finally {
    await browser.close();
  }
}

async function uploadFileToStorage(localPath, targetPath, bucket = "instagram-posts") {
  const supabase = getSupabaseClient();
  const fileBuffer = await fs.readFile(localPath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(targetPath, fileBuffer, { contentType: "image/png", upsert: true });

  if (error) {
    throw new Error(`Upload do Supabase nieudany: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(targetPath);
  return data.publicUrl;
}

export async function renderPostImage(content, options = {}) {
  const {
    postType = "PORADA",
    headline,
    subheadline,
    bodyPoints = [],
    date = new Date().toISOString().slice(0, 10),
  } = content;

  const evaluateArgs = {
    postTypeArg: postType,
    headlineArg: headline || "",
    subheadlineArg: subheadline || "",
    bodyPointsArg: bodyPoints,
    dateArg: date,
  };

  const outputPath = await renderTemplate({
    templatePath: POST_TEMPLATE_PATH,
    width: 1080,
    height: 1080,
    evaluateFn: ({ postTypeArg, headlineArg, subheadlineArg, bodyPointsArg, dateArg }) => {
      document.getElementById("postType").textContent = postTypeArg;
      document.getElementById("headline").textContent = headlineArg;
      document.getElementById("subheadline").textContent = subheadlineArg;
      document.getElementById("date").textContent = dateArg;

      const ul = document.getElementById("bodyPoints");
      ul.innerHTML = "";
      for (const point of bodyPointsArg) {
        const li = document.createElement("li");
        li.textContent = point;
        ul.appendChild(li);
      }
    },
    args: evaluateArgs,
  });

  if (!options.upload) {
    return { localPath: outputPath, publicUrl: null };
  }

  const targetPath = `posts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.png`;
  const publicUrl = await uploadFileToStorage(outputPath, targetPath, options.bucket);
  return { localPath: outputPath, publicUrl };
}

export async function renderCarouselSlideImage(slide, options = {}) {
  const { index = 1, title, body } = slide;

  const outputPath = await renderTemplate({
    templatePath: CAROUSEL_TEMPLATE_PATH,
    width: 1080,
    height: 1080,
    evaluateFn: ({ indexArg, titleArg, bodyArg }) => {
      document.getElementById("slideIndex").textContent = String(indexArg);
      document.getElementById("slideTitle").textContent = titleArg;
      document.getElementById("slideBody").textContent = bodyArg;
    },
    args: {
      indexArg: index,
      titleArg: title || "",
      bodyArg: body || "",
    },
  });

  if (!options.upload) {
    return { localPath: outputPath, publicUrl: null };
  }

  const targetPath = `carousel/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.png`;
  const publicUrl = await uploadFileToStorage(outputPath, targetPath, options.bucket);
  return { localPath: outputPath, publicUrl };
}

async function runSmokeRender() {
  const result = await renderPostImage(
    {
      postType: "TEST",
      headline: "Smoke test",
      subheadline: "Czy renderer dziala?",
      bodyPoints: ["Punkt 1", "Punkt 2", "Punkt 3"],
    },
    { upload: false },
  );

  console.log(JSON.stringify(result, null, 2));
}

if (process.argv.includes("--smoke")) {
  runSmokeRender().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}


