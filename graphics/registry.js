/**
 * graphics/registry.js
 *
 * REJESTR SZABLONÓW — jedyne źródło prawdy o kontrakcie między danymi a grafikami.
 *
 * Każdy wpis opisuje jeden szablon HTML:
 *   - file:        plik w templates/
 *   - size:        wymiary PNG (piksele)
 *   - format:      "feed" (1:1) | "story" (9:16)
 *   - description: opis dla AI i developerów
 *   - fields:      pola wymagane/opcjonalne z typami, limitami i opisami
 *
 * Dodanie nowego szablonu = dodanie wpisu tutaj + plik HTML + evaluator w render.js.
 */

// ─────────────────────────────────────────────────────────────
// REJESTR
// ─────────────────────────────────────────────────────────────

export const TEMPLATE_REGISTRY = {

  // ── FEED POST (1080×1080) ───────────────────────────────────

  "post": {
    file:        "post.html",
    size:        { width: 1080, height: 1080 },
    format:      "feed",
    description: "Okładka posta — nagłówek, podtytuł, lista punktów z bullet",
    fields: {
      postType:    { type: "string",   required: false, default: "POST",  maxLength: 20,  description: "Badge na górze (np. PORADA, CASE STUDY, LISTA, TIPS)" },
      headline:    { type: "string",   required: true,                    maxLength: 60,  description: "Główny nagłówek, max 60 znaków" },
      subheadline: { type: "string",   required: false,                   maxLength: 80,  description: "Podtytuł / kontekst tematu" },
      bodyPoints:  { type: "string[]", required: false, maxItems: 5,                     description: "Lista punktów, max 5 elementów, każdy max 80 znaków" },
      date:        { type: "string",   required: false,                                  description: "Data ISO YYYY-MM-DD (uzupełniana automatycznie)" },
    },
  },

  // ── CAROUSEL SLIDES (1080×1080) ────────────────────────────

  "carousel-slide": {
    file:        "carousel-slide.html",
    size:        { width: 1080, height: 1080 },
    format:      "feed",
    description: "Slajd karuzeli — numer porządkowy, tytuł i treść rozwijająca",
    fields: {
      index: { type: "number", required: true,                               description: "Numer slajdu (1, 2, 3…)" },
      title: { type: "string", required: true,  maxLength: 50,               description: "Tytuł slajdu, max 50 znaków" },
      body:  { type: "string", required: true,  maxLength: 200,              description: "Treść / rozwinięcie slajdu, max 200 znaków" },
    },
  },

  // ── STORY SLIDES (1080×1920) ────────────────────────────────

  "story-hook": {
    file:        "story-hook.html",
    size:        { width: 1080, height: 1920 },
    format:      "story",
    description: "Story slajd 1/3 — hook: pytanie lub prowokacyjne stwierdzenie otwierające",
    fields: {
      postType: { type: "string", required: false, default: "PORADA", maxLength: 20,  description: "Tag kategorii (np. PORADA, TIPS, CASE STUDY)" },
      hookText: { type: "string", required: true,                     maxLength: 120, description: "Tekst haka — pytanie lub stwierdzenie, max 120 znaków" },
    },
  },

  "story-value": {
    file:        "story-value.html",
    size:        { width: 1080, height: 1920 },
    format:      "story",
    description: "Story slajd 2a/3 — wartość edukacyjna: tytuł + ponumerowana lista kroków",
    fields: {
      valueTitle:  { type: "string",   required: true, maxLength: 80,              description: "Nagłówek sekcji wartości, max 80 znaków" },
      valuePoints: { type: "string[]", required: true, minItems: 2, maxItems: 5,   description: "Ponumerowane kroki/punkty, 2–5 elementów, każdy max 80 znaków" },
    },
  },

  "story-quote": {
    file:        "story-quote.html",
    size:        { width: 1080, height: 1920 },
    format:      "story",
    description: "Story slajd 2b/3 — sentencja / cytat z autorem (alternatywa dla story-value)",
    fields: {
      quote:  { type: "string", required: true,  maxLength: 180, description: "Treść sentencji lub cytatu, max 180 znaków" },
      author: { type: "string", required: false, maxLength: 60,  description: "Autor cytatu lub kontekst (opcjonalnie)" },
    },
  },

  "story-cta": {
    file:        "story-cta.html",
    size:        { width: 1080, height: 1920 },
    format:      "story",
    description: "Story slajd 3/3 — CTA zamykający (fioletowe tło, duże logo)",
    fields: {
      ctaMain: { type: "string", required: true,  maxLength: 120, description: "Główne wezwanie do działania, max 120 znaków" },
      ctaSub:  { type: "string", required: false, maxLength: 80,  description: "Drugorzędny tekst CTA (domyślnie: 'Pobierz Inspirio — link w bio')" },
      handle:  { type: "string", required: false, maxLength: 40,  description: "Handle Instagram (np. @inspirio)" },
    },
  },

};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Zwraca definicję szablonu lub rzuca błąd.
 * @param {string} name
 */
export function getTemplate(name) {
  const tpl = TEMPLATE_REGISTRY[name];
  if (!tpl) {
    const available = Object.keys(TEMPLATE_REGISTRY).join(", ");
    throw new Error(`Nieznany szablon: "${name}". Dostępne: ${available}`);
  }
  return tpl;
}

/**
 * Waliduje dane wejściowe względem kontraktu szablonu.
 * Rzuca błąd z listą wszystkich naruszeń (nie zatrzymuje się na pierwszym).
 * @param {string} templateName
 * @param {Record<string, unknown>} data
 */
export function validateTemplateData(templateName, data) {
  const tpl = getTemplate(templateName);
  const errors = [];

  for (const [fieldName, def] of Object.entries(tpl.fields)) {
    const value = data[fieldName];
    const missing = value === undefined || value === null || value === "";

    if (def.required && missing) {
      errors.push(`"${fieldName}" jest wymagane — ${def.description}`);
      continue;
    }

    if (missing) continue; // opcjonalne, brak wartości — OK

    if (def.type === "string" && typeof value !== "string") {
      errors.push(`"${fieldName}" musi być string, otrzymano: ${typeof value}`);
    }

    if (def.type === "string[]") {
      if (!Array.isArray(value)) {
        errors.push(`"${fieldName}" musi być tablicą string[], otrzymano: ${typeof value}`);
      } else {
        if (def.maxItems && value.length > def.maxItems) {
          errors.push(`"${fieldName}": za dużo elementów (${value.length} > ${def.maxItems})`);
        }
        if (def.minItems && value.length < def.minItems) {
          errors.push(`"${fieldName}": za mało elementów (${value.length} < ${def.minItems})`);
        }
      }
    }

    if (def.maxLength && typeof value === "string" && value.length > def.maxLength) {
      errors.push(`"${fieldName}": przekracza limit ${def.maxLength} znaków (ma ${value.length})`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Błędy walidacji dla szablonu "${templateName}":\n${errors.map((e) => `  • ${e}`).join("\n")}`,
    );
  }
}

/**
 * Generuje opis schematu JSON dla danego szablonu — gotowy do wklejenia w AI prompt.
 * @param {string} templateName
 * @returns {string}
 */
export function buildTemplateSchema(templateName) {
  const tpl = getTemplate(templateName);
  const lines = Object.entries(tpl.fields).map(([name, def]) => {
    const req     = def.required ? "wymagane" : "opcjonalne";
    const limit   = def.maxLength ? `, max ${def.maxLength} znaków`
                  : def.maxItems  ? `, max ${def.maxItems} elementów`
                  : "";
    const defVal  = def.default !== undefined ? `, domyślnie: "${def.default}"` : "";
    return `  "${name}": ${def.type}  // ${req}${limit}${defVal} — ${def.description}`;
  });
  return `// Szablon: ${templateName} — ${tpl.description}\n{\n${lines.join(",\n")}\n}`;
}

/**
 * Zwraca listę wszystkich szablonów danego formatu.
 * @param {"feed"|"story"} format
 */
export function getTemplatesByFormat(format) {
  return Object.entries(TEMPLATE_REGISTRY)
    .filter(([, tpl]) => tpl.format === format)
    .map(([name, tpl]) => ({ name, ...tpl }));
}

