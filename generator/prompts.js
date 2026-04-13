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

/**
 * Buduje prompt dla Story (3 slajdy: hook → value|quote → cta).
 * Schemat każdego slajdu pochodzi z rejestru — spójne z grafikami.
 */
export function buildStoryPrompt({ topic, dateIso }) {
  const hookSchema  = buildTemplateSchema("story-hook");
  const valueSchema = buildTemplateSchema("story-value");
  const quoteSchema = buildTemplateSchema("story-quote");
  const ctaSchema   = buildTemplateSchema("story-cta");

  return [
    "Jesteś social media strategist specjalizującym się w treściach na Instagram.",
    "Przygotuj materiał na sekwencję Instagram Stories (3 slajdy) po polsku.",
    `Temat: ${topic}`,
    `Data publikacji: ${dateIso}`,
    "",
    "Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:",
    "{",
    '  "caption": string,   // opis do Stories, max 2200 znaków, angażujący, z emotikonami',
    '  "tags": string[],    // 5–10 hashtagów, każdy zaczyna się od #',
    '  "slides": array      // dokładnie 3 slajdy opisane poniżej',
    "}",
    "",
    "Slajd 1 — hook, wstęp który zatrzyma palec (pole \"type\" = \"hook\"):",
    hookSchema,
    "",
    "Slajd 2 — wybierz JEDEN wariant, bardziej pasujący do tematu:",
    "  Wariant A — lista porad (pole \"type\" = \"value\"):",
    valueSchema,
    "  Wariant B — inspirująca sentencja (pole \"type\" = \"quote\"):",
    quoteSchema,
    "",
    "Slajd 3 — CTA zamykający (pole \"type\" = \"cta\"):",
    ctaSchema,
    "",
    'WAŻNE: każdy slajd musi zawierać pole "type" z wartością: "hook", "value", "quote" lub "cta".',
    "Kolejność: slajd 1 = hook, slajd 2 = value lub quote, slajd 3 = cta.",
  ].join("\n");
}

/**
 * Buduje prompt do generowania świeżego temat/kąta dla filaru tygodniowego.
 * AI konfrontuje filar z aktualnymi trendami i historią publikacji.
 *
 * @param {{ pillar: string, pillarDescription: string, recentTopics: string[], dateIso: string }} params
 * @returns {string}
 */
export function buildTopicPrompt({ pillar, pillarDescription, recentTopics, dateIso }) {
  const historyBlock =
    recentTopics.length > 0
      ? `Ostatnio opublikowane tematy (NIE powtarzaj tych motywów):\n${recentTopics.map((t) => `- ${t}`).join("\n")}`
      : "Brak historii publikacji — możesz wybrać dowolny temat w ramach filaru.";

  return [
    "Jesteś strategiem social media specjalizującym się w Instagramie.",
    "",
    `Tygodniowy filar tematyczny: "${pillar}"`,
    `Opis filaru: ${pillarDescription}`,
    `Data publikacji: ${dateIso}`,
    "",
    "Twoje zadanie: wymyśl JEDEN konkretny, świeży temat/kąt dla posta w ramach tego filaru.",
    "Temat powinien być:",
    "- aktualny — nawiąż do obecnych trendów, zmian algorytmu lub wydarzeń jeśli to możliwe",
    "- konkretny i praktyczny — unikaj ogólników, daj coś do wdrożenia od razu",
    "- inny od poprzednich tematów (ale może rozwijać wcześniej poruszony wątek z nowego kąta)",
    "- angażujący w formie pytania, provocacji lub zaskakującego stwierdzenia",
    "",
    historyBlock,
    "",
    'Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy): { "topic": "..." }',
    "Temat: max 100 znaków, po polsku.",
  ].join("\n");
}

/**
 * Jedno wywołanie Gemini → treść dla karuzeli I story naraz.
 * Schemat obu sekcji pochodzi z rejestru — spójne z grafikami.
 *
 * @param {{ topic: string, dateIso: string }} params
 * @returns {string}
 */
export function buildCombinedPrompt({ topic, dateIso }) {
  const carouselSlideSchema = buildTemplateSchema("carousel-slide");
  const hookSchema          = buildTemplateSchema("story-hook");
  const valueSchema         = buildTemplateSchema("story-value");
  const quoteSchema         = buildTemplateSchema("story-quote");
  const ctaSchema           = buildTemplateSchema("story-cta");

  return [
    "Jesteś social media strategist specjalizującym się w treściach na Instagram.",
    "Na podstawie jednego tematu przygotuj materiał na POST KARUZELOWY i INSTAGRAM STORY po polsku.",
    `Temat: ${topic}`,
    `Data publikacji: ${dateIso}`,
    "",
    "Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:",
    "{",
    '  "tags": string[],     // 5–10 hashtagów wspólnych dla obu formatów, każdy zaczyna się od #',
    '  "carousel": {',
    '    "caption": string,   // opis posta karuzelowego, max 2200 znaków, angażujący, z emotikonami',
    '    "slides": array      // 3–5 slajdów (schemat poniżej)',
    '  },',
    '  "story": {',
    '    "caption": string,   // skrócona wersja opisu dla Stories, max 200 znaków, z emotikonami',
    '    "slides": array      // dokładnie 3 slajdy (schemat poniżej)',
    '  }',
    "}",
    "",
    "── KARUZELA: kontrakt slajdu ──",
    carouselSlideSchema,
    "",
    "Zasady slajdów karuzeli:",
    "- Slajd 1: hook — angażujące pytanie lub zaskakujące stwierdzenie",
    "- Slajdy środkowe: konkretna wartość / porady możliwe do wdrożenia od razu",
    "- Ostatni slajd: CTA — zachęta do zapisu, komentarza lub udostępnienia",
    "",
    "── STORY: 3 slajdy (hook → value lub quote → cta) ──",
    "",
    'Story slajd 1 — hook (pole "type" = "hook"):',
    hookSchema,
    "",
    "Story slajd 2 — wybierz JEDEN wariant lepiej pasujący do tematu:",
    '  Wariant A — lista porad (pole "type" = "value"):',
    valueSchema,
    '  Wariant B — cytat/sentencja (pole "type" = "quote"):',
    quoteSchema,
    "",
    'Story slajd 3 — CTA (pole "type" = "cta"):',
    ctaSchema,
    "",
    "WAŻNE: Story powinna być skondensowaną esencją karuzeli — te same kluczowe wnioski, inne ujęcie.",
    'Każdy slajd story musi zawierać pole "type": "hook" | "value" | "quote" | "cta".',
  ].join("\n");
}

/**
 * Normalizuje odpowiedź combinedPrompt: waliduje obie sekcje i wstrzykuje
 * wspólne tagi do obiektów carousel i story.
 *
 * @returns {{ tags: string[], carousel: ReturnType<normalizeGeneratedPayload>, story: ReturnType<normalizeStoryPayload> }}
 */
export function normalizeCombinedPayload(payload) {
  if (!payload.carousel || !payload.story) {
    throw new Error("Gemini nie zwrócił wymaganych sekcji 'carousel' i 'story'.");
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag) => typeof tag === "string" && tag.trim().startsWith("#"))
    : [];

  // Wstrzyknij wspólne tagi do obu sekcji przed normalizacją
  const carousel = normalizeGeneratedPayload({ tags, ...payload.carousel });
  const story    = normalizeStoryPayload({ tags, ...payload.story });

  return { tags, carousel, story };
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

/**
 * Waliduje i normalizuje odpowiedź Gemini dla Story.
 * Każdy slajd musi mieć pole "type": "hook" | "value" | "quote" | "cta".
 */
export function normalizeStoryPayload(payload) {
  const slides = Array.isArray(payload.slides) ? payload.slides : [];
  if (slides.length === 0) {
    throw new Error("Gemini nie zwrócił slajdów story.");
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag) => typeof tag === "string" && tag.trim().startsWith("#"))
    : [];

  const VALID_TYPES = ["hook", "value", "quote", "cta"];
  const normalizedSlides = slides.map((slide, index) => {
    const type = slide.type;
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Nieznany typ slajdu story: "${type}" (slajd ${index + 1}). Oczekiwano: ${VALID_TYPES.join(", ")}`);
    }

    const base = { index: index + 1, type };

    switch (type) {
      case "hook":
        return {
          ...base,
          postType: typeof slide.postType === "string" ? slide.postType.slice(0, 20) : "PORADA",
          hookText: typeof slide.hookText === "string" ? slide.hookText.trim().slice(0, 120) : "",
        };
      case "value":
        return {
          ...base,
          valueTitle:  typeof slide.valueTitle === "string" ? slide.valueTitle.trim().slice(0, 80) : "",
          valuePoints: Array.isArray(slide.valuePoints)
            ? slide.valuePoints.slice(0, 5).map((p) => String(p).trim().slice(0, 80))
            : [],
        };
      case "quote":
        return {
          ...base,
          quote:  typeof slide.quote  === "string" ? slide.quote.trim().slice(0, 180)  : "",
          author: typeof slide.author === "string" ? slide.author.trim().slice(0, 60) : undefined,
        };
      case "cta":
        return {
          ...base,
          ctaMain: typeof slide.ctaMain === "string" ? slide.ctaMain.trim().slice(0, 120) : "",
          ctaSub:  typeof slide.ctaSub  === "string" ? slide.ctaSub.trim().slice(0, 80)  : undefined,
          handle:  typeof slide.handle  === "string" ? slide.handle.trim().slice(0, 40)  : undefined,
        };
    }
  });

  return {
    caption: typeof payload.caption === "string" ? payload.caption.trim().slice(0, 2200) : "",
    tags,
    slides: normalizedSlides,
  };
}

