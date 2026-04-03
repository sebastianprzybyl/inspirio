export function buildContentPrompt({ topic, dateIso }) {
  return [
    "Jestes social media strategist.",
    "Przygotuj material na Instagram po polsku.",
    `Temat: ${topic}`,
    `Data: ${dateIso}`,
    "Zasady:",
    "1) Zwroc wyłącznie poprawny JSON (bez markdown).",
    "2) JSON musi miec pola: caption (string), tags (string[]), slides (array min 3).",
    "3) Kazdy slide ma pola: title (string), body (string).",
    "4) Tags musza zaczynac sie od #.",
    "5) Caption max 1600 znakow.",
  ].join("\n");
}

export function parseClaudeJson(rawText) {
  const trimmed = rawText.trim();
  const maybeCodeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = maybeCodeBlock ? maybeCodeBlock[1] : trimmed;
  return JSON.parse(jsonText);
}

export function normalizeGeneratedPayload(payload) {
  const slides = Array.isArray(payload.slides) ? payload.slides : [];
  if (slides.length === 0) {
    throw new Error("Claude nie zwrocil slajdow.");
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag) => typeof tag === "string" && tag.trim().startsWith("#"))
    : [];

  return {
    caption: typeof payload.caption === "string" ? payload.caption.trim() : "",
    tags,
    slides: slides.map((slide, index) => ({
      index: index + 1,
      title: typeof slide.title === "string" ? slide.title.trim() : `Slajd ${index + 1}`,
      body: typeof slide.body === "string" ? slide.body.trim() : "",
    })),
  };
}

