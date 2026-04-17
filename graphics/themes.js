/**
 * graphics/themes.js
 *
 * Palety kolorystyczne dla szablonów graficznych.
 * Każdy motyw nadpisuje zmienne CSS z brand.css przez wstrzyknięcie <style>
 * w Puppeteer — żaden plik HTML nie wymaga zmian.
 *
 * Kolory wywodzą się z gradientu logo Inspirio (public/icon.svg):
 *   #FF2C2A → #FF6F6D → #FF8C8E → #FEB7BF
 *
 * Struktura:
 *   3 rodziny kolorystyczne × 2 warianty = 6 motywów w rotacji.
 *   Wariant "dark"  → ciemne tło + kolor jako akcent
 *   Wariant "light" → kolor jako tło (jasne) + ciemny tekst
 */

// ─────────────────────────────────────────────────────────────
// Kolory bazowe — wywodzone z logo (icon.svg)
// ─────────────────────────────────────────────────────────────

const BASE = {
  // Żywy koral — ciemny stop gradientu logo (#FF2C2A), lekko rozjaśniony dla UI
  coral: {
    h:         "#FF5250",
    strong:    "#C01A18",
    bg:        "#0C0504",
    bgSurf:    "#180D0C",
    bgDiv:     "#2A1614",
    pastelBg:  "#FFF0F0",
    pastelMid: "#FFBCBA",
    pastelDiv: "#FFD5D4",
    darkText:  "#1E0706",
    mutedDark: "#9A3835",
  },

  // Miękki koral-róż — środkowy stop gradientu logo (#FF8C8E)
  rose: {
    h:         "#FF8284",
    strong:    "#C02840",
    bg:        "#0F0708",
    bgSurf:    "#1C1012",
    bgDiv:     "#2E1A1C",
    pastelBg:  "#FFF0F2",
    pastelMid: "#FFBEC2",
    pastelDiv: "#FFD5D8",
    darkText:  "#280A0E",
    mutedDark: "#9A3045",
  },

  // Blush — najjaśniejszy stop gradientu logo (#FEB7BF), delikatny
  blush: {
    h:         "#FEA8AE",
    strong:    "#B82840",
    bg:        "#100709",
    bgSurf:    "#1C1014",
    bgDiv:     "#301820",
    pastelBg:  "#FFF5F7",
    pastelMid: "#FFD0D5",
    pastelDiv: "#FFE4E7",
    darkText:  "#280A12",
    mutedDark: "#904050",
  },
};

export const THEMES = {

  // ── CORAL ─────────────────────────────────────────────────
  /** Flagowy ciemny — głęboka czerń z żywym koralowym akcentem (#FF2C2A) */
  "coral-dark": {
    bg:           BASE.coral.bg,
    surface:      BASE.coral.bgSurf,
    divider:      BASE.coral.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#B07070",
    accent:       BASE.coral.h,
    accentSoft:   BASE.coral.pastelBg,
    accentStrong: BASE.coral.strong,
  },
  /** Czyste tło z wyraźnym koralowym akcentem */
  "coral-light": {
    bg:           BASE.coral.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.coral.pastelDiv,
    textMain:     BASE.coral.darkText,
    textMuted:    BASE.coral.mutedDark,
    accent:       BASE.coral.strong,
    accentSoft:   BASE.coral.pastelMid,
    accentStrong: BASE.coral.darkText,
  },

  // ── ROSE ──────────────────────────────────────────────────
  /** Ciemne tło, miękki różano-koralowy akcent (#FF8C8E) */
  "rose-dark": {
    bg:           BASE.rose.bg,
    surface:      BASE.rose.bgSurf,
    divider:      BASE.rose.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#B07880",
    accent:       BASE.rose.h,
    accentSoft:   BASE.rose.pastelBg,
    accentStrong: BASE.rose.strong,
  },
  /** Ciepłe jasno-różowe tło, stonowany akcent */
  "rose-light": {
    bg:           BASE.rose.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.rose.pastelDiv,
    textMain:     BASE.rose.darkText,
    textMuted:    BASE.rose.mutedDark,
    accent:       BASE.rose.strong,
    accentSoft:   BASE.rose.pastelMid,
    accentStrong: BASE.rose.darkText,
  },

  // ── BLUSH ─────────────────────────────────────────────────
  /** Ciemne tło, delikatny blushowy akcent (#FEB7BF) */
  "blush-dark": {
    bg:           BASE.blush.bg,
    surface:      BASE.blush.bgSurf,
    divider:      BASE.blush.bgDiv,
    textMain:     "#FFF8F8",
    textMuted:    "#B08090",
    accent:       BASE.blush.h,
    accentSoft:   BASE.blush.pastelBg,
    accentStrong: BASE.blush.strong,
  },
  /** Eleganckie blush tło, subtelny ciemnoróżowy akcent */
  "blush-light": {
    bg:           BASE.blush.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.blush.pastelDiv,
    textMain:     BASE.blush.darkText,
    textMuted:    BASE.blush.mutedDark,
    accent:       BASE.blush.strong,
    accentSoft:   BASE.blush.pastelMid,
    accentStrong: BASE.blush.darkText,
  },

};

export const THEME_NAMES = Object.keys(THEMES);

/**
 * Wybiera motyw deterministycznie na podstawie daty ISO.
 * Carousel i story generowane tego samego dnia mają tę samą paletę.
 *
 * @param {string} dateIso - YYYY-MM-DD
 * @returns {string} nazwa motywu
 */
export function pickThemeForDate(dateIso) {
  const dayNumber = Math.floor(new Date(dateIso).getTime() / 86400000);
  return THEME_NAMES[dayNumber % THEME_NAMES.length];
}

/**
 * Zwraca blok CSS nadpisujący zmienne :root dla danego motywu.
 * Wstrzykiwany przez Puppeteer po załadowaniu szablonu.
 *
 * @param {string} themeName
 * @returns {string}
 */
export function themeToCSS(themeName) {
  const t = THEMES[themeName] ?? THEMES["coral-dark"];
  return [
    ":root {",
    `  --bg:            ${t.bg};`,
    `  --surface:       ${t.surface};`,
    `  --divider:       ${t.divider};`,
    `  --text-main:     ${t.textMain};`,
    `  --text-muted:    ${t.textMuted};`,
    `  --accent:        ${t.accent};`,
    `  --accent-soft:   ${t.accentSoft};`,
    `  --accent-strong: ${t.accentStrong};`,
    "}",
  ].join("\n");
}
