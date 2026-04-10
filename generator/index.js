import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { renderCarouselSlideImage, renderPostImage, renderStorySlideImage } from "../graphics/render.js";
import { buildContentPrompt, buildStoryPrompt, normalizeGeneratedPayload, normalizeStoryPayload, parseGeminiJson } from "./prompts.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOPICS_PATH = path.join(__dirname, "topics.json");

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Brak SUPABASE_URL lub SUPABASE_KEY.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function getTopicForToday(referenceDate = new Date()) {
  const raw = await fs.readFile(TOPICS_PATH, "utf8");
  const topics = JSON.parse(raw);
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error("topics.json jest puste.");
  }

  const dayOfYear = Math.floor((referenceDate - new Date(referenceDate.getFullYear(), 0, 0)) / 86400000);
  return topics[(dayOfYear - 1) % topics.length];
}

async function generateWithGemini({ topic, dateIso }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      caption: `Testowy opis dla tematu: ${topic}`,
      tags: ["#instagram", "#marketing", "#inspirio"],
      slides: [
        { index: 1, title: "Hook", body: "Zacznij od jednego jasnego problemu odbiorcy." },
        { index: 2, title: "Wartosc", body: "Pokaz 3 kroki, ktore mozna wdrozyc od razu." },
        { index: 3, title: "CTA", body: "Popros o zapisanie posta i komentarz z pytaniem." },
      ],
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildContentPrompt({ topic, dateIso }),
    config: {
      temperature: 0.6,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini nie zwrocil tekstu.");
  }

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
    config: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
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

export async function runGenerator({ dryRun = false, contentType = "carousel" } = {}) {
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);
  const topic = await getTopicForToday(now);

  const shouldUpload = !dryRun && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

  let postRecord;

  if (contentType === "story") {
    // ── Flow Story ────────────────────────────────────────────
    const generated = await generateStoryWithGemini({ topic, dateIso });

    const storySlides = [];
    for (const slide of generated.slides) {
      const rendered = await renderStorySlideImage(slide, { upload: shouldUpload });
      storySlides.push({ ...slide, image_url: rendered.publicUrl, local_path: rendered.localPath });
    }

    postRecord = {
      status:    "pending",
      type:      "story",
      topic,
      caption:   generated.caption,
      tags:      generated.tags,
      image_url: storySlides[0]?.image_url ?? null, // cover = pierwszy slajd (hook)
      slides:    storySlides,
    };

  } else {
    // ── Flow Carousel / Post (dotychczasowe) ──────────────────
    const generated = await generateWithGemini({ topic, dateIso });

    const postImage = await renderPostImage(
      {
        postType:    "POST",
        headline:    generated.slides[0]?.title || topic,
        subheadline: topic,
        bodyPoints:  generated.slides.slice(0, 3).map((slide) => slide.body),
        date:        dateIso,
      },
      { upload: shouldUpload },
    );

    const slidesWithImages = [];
    for (const slide of generated.slides) {
      const renderedSlide = await renderCarouselSlideImage(slide, { upload: shouldUpload });
      slidesWithImages.push({ ...slide, image_url: renderedSlide.publicUrl, local_path: renderedSlide.localPath });
    }

    postRecord = {
      status:    "pending",
      type:      slidesWithImages.length > 1 ? "carousel" : "post",
      topic,
      caption:   generated.caption,
      tags:      generated.tags,
      image_url: postImage.publicUrl,
      slides:    slidesWithImages,
    };
  }

  const saved = await savePostToSupabase(postRecord, dryRun);
  return { topic, generated: postRecord, saved };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const dryRun     = process.argv.includes("--dry-run");
  const contentType = process.argv.includes("--story") ? "story" : "carousel";
  runGenerator({ dryRun, contentType })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}


