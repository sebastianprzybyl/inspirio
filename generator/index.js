import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient } from "../lib/supabase.js";
import { renderCarouselSlideImage, renderPostImage, renderStorySlideImage } from "../graphics/render.js";
import { pickThemeForDate } from "../graphics/themes.js";
import { buildCombinedPrompt, buildContentPrompt, buildStoryPrompt, buildTopicPrompt, normalizeCombinedPayload, normalizeGeneratedPayload, normalizeStoryPayload, parseGeminiJson } from "./prompts.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOPICS_PATH = path.join(__dirname, "topics.json");
const CAMPAIGN_PATH = path.join(__dirname, "campaign.json");


export async function getTopicForToday(referenceDate = new Date()) {
  const raw = await fs.readFile(TOPICS_PATH, "utf8");
  const topics = JSON.parse(raw);
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error("topics.json jest puste.");
  }

  const dayOfYear = Math.floor((referenceDate - new Date(referenceDate.getFullYear(), 0, 0)) / 86400000);
  return topics[(dayOfYear - 1) % topics.length];
}

/**
 * Zwraca konfigurację filaru dla podanego dnia tygodnia z campaign.json.
 * Zwraca null jeśli dla danego dnia nie ma wpisu (np. weekend).
 *
 * @param {Date} referenceDate
 * @returns {Promise<{ pillar: string, pillarDescription: string, contentType: string } | null>}
 */
export async function getDayConfig(referenceDate = new Date()) {
  const raw = await fs.readFile(CAMPAIGN_PATH, "utf8");
  const campaign = JSON.parse(raw);
  const dayOfWeek = referenceDate.getDay(); // 0 = niedziela, 1 = poniedziałek, …
  return campaign.schedule[String(dayOfWeek)] ?? null;
}

/**
 * Generuje świeży temat dla filaru tygodniowego z pomocą Gemini.
 * Pobiera historię ostatnich 30 tematów z Supabase (jeśli dostępna),
 * by AI nie powtarzało poruszonych motywów.
 * Fallback: getTopicForToday() gdy brak kluczy API.
 *
 * @param {{ pillar: string, pillarDescription: string, dateIso: string }} params
 * @returns {Promise<string>}
 */
async function generateTopicWithAI({ pillar, pillarDescription, dateIso }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Generator] Brak GEMINI_API_KEY — używam fallback getTopicForToday().");
    return getTopicForToday(new Date(dateIso));
  }

  let recentTopics = [];
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("posts")
        .select("topic")
        .order("created_at", { ascending: false })
        .limit(30);
      recentTopics = (data || []).map((r) => r.topic).filter(Boolean);
    } catch (err) {
      console.warn("[Generator] Nie udało się pobrać historii z Supabase:", err.message);
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildTopicPrompt({ pillar, pillarDescription, recentTopics, dateIso }),
    config: { temperature: 0.85, maxOutputTokens: 256 },
  });

  const text = response.text;
  if (!text) {
    console.warn("[Generator] Gemini nie zwrócił tematu — używam fallback.");
    return getTopicForToday(new Date(dateIso));
  }

  try {
    const parsed = parseGeminiJson(text);
    if (parsed?.topic && typeof parsed.topic === "string") {
      return parsed.topic.trim().slice(0, 100);
    }
  } catch {
    console.warn("[Generator] Błąd parsowania tematu z Gemini — używam fallback.");
  }

  return getTopicForToday(new Date(dateIso));
}

/**
 * Jedno wywołanie Gemini → treść dla obu formatów naraz.
 * Fallback (brak klucza) zwraca mockowe dane dla obu sekcji.
 */
async function generateCombinedWithGemini({ topic, dateIso }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const tags = ["#instagram", "#marketing", "#inspirio"];
    return {
      tags,
      carousel: {
        caption: `Testowy opis dla tematu: ${topic}`,
        tags,
        slides: [
          { index: 1, title: "Hook", body: "Zacznij od jednego jasnego problemu odbiorcy." },
          { index: 2, title: "Wartość", body: "Pokaż 3 kroki, które można wdrożyć od razu." },
          { index: 3, title: "CTA", body: "Poproś o zapisanie posta i komentarz z pytaniem." },
        ],
      },
      story: {
        caption: `Testowy opis Story dla tematu: ${topic}`,
        tags,
        slides: [
          { type: "hook",  postType: "PORADA", hookText: "Czy Twój Instagram przyciąga uwagę w 3 sekundy?" },
          { type: "value", valueTitle: "3 sposoby na lepsze treści", valuePoints: ["Hook w pierwszym slajdzie", "Konkretna wartość w środku", "Jasne CTA na końcu"] },
          { type: "cta",   ctaMain: "Zacznij tworzyć lepsze Stories już dziś!", ctaSub: "Pobierz Inspirio — link w bio", handle: "@inspirio" },
        ],
      },
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildCombinedPrompt({ topic, dateIso }),
    config: { temperature: 0.65, maxOutputTokens: 6144 },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini nie zwrócił tekstu dla połączonego generowania.");

  return normalizeCombinedPayload(parseGeminiJson(text));
}

// Używane tylko gdy --carousel lub --story wymuszy pojedynczy format z CLI
async function generateWithGemini({ topic, dateIso }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      caption: `Testowy opis dla tematu: ${topic}`,
      tags: ["#instagram", "#marketing", "#inspirio"],
      slides: [
        { index: 1, title: "Hook", body: "Zacznij od jednego jasnego problemu odbiorcy." },
        { index: 2, title: "Wartość", body: "Pokaż 3 kroki, które można wdrożyć od razu." },
        { index: 3, title: "CTA", body: "Poproś o zapisanie posta i komentarz z pytaniem." },
      ],
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildContentPrompt({ topic, dateIso }),
    config: { temperature: 0.6, maxOutputTokens: 4096 },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini nie zwrócił tekstu.");
  return normalizeGeneratedPayload(parseGeminiJson(text));
}

async function generateStoryWithGemini({ topic, dateIso }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      caption: `Testowy opis Story dla tematu: ${topic}`,
      tags: ["#instagram", "#story", "#inspirio"],
      slides: [
        { type: "hook",  postType: "PORADA", hookText: "Czy Twój Instagram przyciąga uwagę w 3 sekundy?" },
        { type: "value", valueTitle: "3 sposoby na lepsze treści", valuePoints: ["Hook w pierwszym slajdzie", "Konkretna wartość w środku", "Jasne CTA na końcu"] },
        { type: "cta",   ctaMain: "Zacznij tworzyć lepsze Stories już dziś!", ctaSub: "Pobierz Inspirio — link w bio", handle: "@inspirio" },
      ],
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildStoryPrompt({ topic, dateIso }),
    config: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini nie zwrócił tekstu dla Story.");
  return normalizeStoryPayload(parseGeminiJson(text));
}

async function savePostToSupabase(post, dryRun) {
  if (dryRun) {
    return { dryRun: true, post };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select("id, status, type, created_at")
    .single();

  if (error) {
    throw new Error(`Blad zapisu do Supabase: ${error.message}`);
  }
  return data;
}

// ── Render functions (czyste — przyjmują wygenerowane dane, nie wywołują Gemini) ──────────────

async function renderCarouselRecord({ generated, topic, dateIso, shouldUpload, theme }) {
  const postImage = await renderPostImage(
    {
      postType:    "POST",
      headline:    generated.slides[0]?.title || topic,
      subheadline: topic,
      bodyPoints:  generated.slides.slice(0, 3).map((s) => s.body),
      date:        dateIso,
    },
    { upload: shouldUpload, theme },
  );
  const slidesWithImages = [];
  for (const slide of generated.slides) {
    const rendered = await renderCarouselSlideImage(slide, { upload: shouldUpload, theme });
    slidesWithImages.push({ ...slide, image_url: rendered.publicUrl, local_path: rendered.localPath });
  }
  return {
    status:    "pending",
    type:      slidesWithImages.length > 1 ? "carousel" : "post",
    topic,
    caption:   generated.caption,
    tags:      generated.tags,
    image_url: postImage.publicUrl,
    slides:    slidesWithImages,
  };
}

async function renderStoryRecord({ generated, topic, shouldUpload, theme }) {
  const storySlides = [];
  for (const slide of generated.slides) {
    const rendered = await renderStorySlideImage(slide, { upload: shouldUpload, theme });
    storySlides.push({ ...slide, image_url: rendered.publicUrl, local_path: rendered.localPath });
  }
  return {
    status:    "pending",
    type:      "story",
    topic,
    caption:   generated.caption,
    tags:      generated.tags,
    image_url: storySlides[0]?.image_url ?? null,
    slides:    storySlides,
  };
}

// Używane tylko gdy --carousel lub --story wymuszy pojedynczy format z CLI
async function generateSinglePost({ topic, dateIso, contentType, shouldUpload, theme }) {
  if (contentType === "story") {
    const generated = await generateStoryWithGemini({ topic, dateIso });
    return renderStoryRecord({ generated, topic, shouldUpload, theme });
  }
  const generated = await generateWithGemini({ topic, dateIso });
  return renderCarouselRecord({ generated, topic, dateIso, shouldUpload, theme });
}

/**
 * Domyślnie generuje oba formaty (carousel + story) na ten sam temat.
 * Flaga contentType wymusza jeden format — przydatna w CLI i testach.
 *
 * @returns {Promise<null | { pillar, topic, results: Array<{ generated, saved }> }>}
 */
export async function runGenerator({ dryRun = false, contentType } = {}) {
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);

  const dayConfig = await getDayConfig(now);
  if (!dayConfig) {
    console.log(`[Generator] Dzień ${now.getDay()} (${dateIso}) nie ma wpisu w kampanii — brak publikacji.`);
    return null;
  }

  const { pillar, pillarDescription } = dayConfig;
  const shouldUpload = !dryRun && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

  // Jeden motyw kolorystyczny na cały dzień (carousel + story spójne wizualnie)
  const theme = pickThemeForDate(dateIso);

  // Jeden wspólny temat na oba formaty dnia
  console.log(`[Generator] Filar: "${pillar}" | Motyw: ${theme} | Data: ${dateIso}`);
  const topic = await generateTopicWithAI({ pillar, pillarDescription, dateIso });
  console.log(`[Generator] Temat: "${topic}"`);

  const results = [];

  if (contentType) {
    // Wymuszone z CLI — jedno wywołanie Gemini, jeden rekord
    console.log(`[Generator] Wymuszony format: ${contentType}…`);
    const postRecord = await generateSinglePost({ topic, dateIso, contentType, shouldUpload, theme });
    results.push({ generated: postRecord, saved: await savePostToSupabase(postRecord, dryRun) });
  } else {
    // Domyślny flow — jedno wywołanie Gemini, dwa rekordy
    console.log("[Generator] Generowanie carousel + story (jedno wywołanie Gemini)…");
    const combined = await generateCombinedWithGemini({ topic, dateIso });

    console.log("[Generator] Renderowanie: carousel…");
    const carouselRecord = await renderCarouselRecord({ generated: combined.carousel, topic, dateIso, shouldUpload, theme });
    results.push({ generated: carouselRecord, saved: await savePostToSupabase(carouselRecord, dryRun) });

    console.log("[Generator] Renderowanie: story…");
    const storyRecord = await renderStoryRecord({ generated: combined.story, topic, shouldUpload, theme });
    results.push({ generated: storyRecord, saved: await savePostToSupabase(storyRecord, dryRun) });
  }

  return { pillar, topic, theme, results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const dryRun = process.argv.includes("--dry-run");
  // --story i --carousel wymuszają format niezależnie od harmonogramu kampanii
  const contentType = process.argv.includes("--story")
    ? "story"
    : process.argv.includes("--carousel")
      ? "carousel"
      : undefined; // undefined → użyj wartości z campaign.json dla danego dnia
  runGenerator({ dryRun, contentType })
    .then((result) => {
      if (result === null) {
        console.log("[Generator] Brak publikacji dla tego dnia (wg harmonogramu kampanii).");
        return;
      }
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}


