import { buildTemplateSchema } from "../graphics/registry.js";

/**
 * Buduje prompt dla Gemini. Schemat slajdów jest generowany dynamicznie
 * z rejestru szablonów — zmiana kontraktu w registry.js automatycznie
 * aktualizuje instrukcję dla AI.
 */
export function buildContentPrompt({ topic, dateIso }) {
  const slideSchema = buildTemplateSchema("carousel-slide");

  return [
    "Jesteś social media strategist specjalizującym się w treściach na Instagram.",
    "Przygotuj materiał na post karuzelowy po polsku.",
    `Temat: ${topic}`,
    `Data publikacji: ${dateIso}`,
    "",
    "Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:",
    "{",
    '  "caption": string,   // opis posta, max 2200 znaków, angażujący, z emotikonami',
    '  "tags": string[],    // 5–10 hashtagów, każdy zaczyna się od #',
    '  "slides": array      // 3–5 slajdów, każdy zgodny ze schematem poniżej',
    "}",
    "",
    "Kontrakt slajdu (każdy element tablicy slides musi pasować):",
    slideSchema,
    "",
    "Zasady tworzenia slajdów:",
    "- Slajd 1: hook — angażujące pytanie lub zaskakujące stwierdzenie",
    "- Slajdy środkowe: konkretna wartość / porady możliwe do wdrożenia od razu",
    "- Ostatni slajd: CTA — zachęta do zapisu, komentarza lub udostępnienia",
  ].join("\n");
}

export function parseGeminiJson(rawText) {
  const trimmed = rawText.trim();

  // Strategia 1: code block z zamknięciem ```...```
  const withClose = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (withClose) {
    try { return JSON.parse(withClose[1].trim()); } catch { /* przejdź do następnej */ }
  }

  // Strategia 2: code block BEZ zamknięcia (Gemini czasem go pomija)
  const withoutClose = trimmed.match(/```(?:json)?\s*([\s\S]+)/i);
  if (withoutClose) {
    try { return JSON.parse(withoutClose[1].trim()); } catch { /* przejdź do następnej */ }
  }

  // Strategia 3: wyodrębnij obiekt JSON po pierwszym { i ostatnim } (najodporniejsza)
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  // Strategia 4: plain JSON (bez owijania)
  return JSON.parse(trimmed);
}

/** @deprecated Użyj parseGeminiJson */
export const parseClaudeJson = parseGeminiJson;

export function normalizeGeneratedPayload(payload) {
  const slides = Array.isArray(payload.slides) ? payload.slides : [];
  if (slides.length === 0) {
    throw new Error("Gemini nie zwrócił slajdów.");
  }
  if (slides.length > 10) {
    slides.length = 10; // Instagram carousel max
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag) => typeof tag === "string" && tag.trim().startsWith("#"))
    : [];

  return {
    caption: typeof payload.caption === "string" ? payload.caption.trim().slice(0, 2200) : "",
    tags,
    slides: slides.map((slide, index) => ({
      index: index + 1,
      title: typeof slide.title === "string" ? slide.title.trim().slice(0, 50)  : `Slajd ${index + 1}`,
      body:  typeof slide.body  === "string" ? slide.body.trim().slice(0, 200) : "",
    })),
  };
}
