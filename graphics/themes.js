/**
 * graphics/themes.js
 *
 * Palety kolorystyczne dla szablonów graficznych.
 * Każdy motyw nadpisuje zmienne CSS z brand.css przez wstrzyknięcie <style>
 * w Puppeteer — żaden plik HTML nie wymaga zmian.
 *
 * Struktura:
 *   6 kolorów bazowych × 2 warianty = 12 motywów w rotacji.
 *   Wariant "dark"  → ciemne tło + kolor jako akcent
 *   Wariant "light" → kolor jako tło (pastelowe) + ciemny tekst
 *   Dzięki temu ten sam kolor raz jest tłem, raz napisem.
 */

// ─────────────────────────────────────────────────────────────
// Kolory bazowe projektu
// ─────────────────────────────────────────────────────────────

const BASE = {
  violet: { h: "#7F77DD", strong: "#3C3489", bg: "#0E0E10", bgSurf: "#17171C", bgDiv: "#2A2A2E", pastelBg: "#EEEDFE", pastelMid: "#C4B5FF", pastelDiv: "#D0C8FC", darkText: "#1A1040", mutedDark: "#5550A0" },
  blue:   { h: "#60A8F8", strong: "#1A4EA0", bg: "#050B18", bgSurf: "#0A1228", bgDiv: "#141E38", pastelBg: "#E0EEFF", pastelMid: "#93C0F8", pastelDiv: "#B8D4FC", darkText: "#0C2040", mutedDark: "#2060A0" },
  green:  { h: "#52CC80", strong: "#166636", bg: "#060F08", bgSurf: "#0C1A10", bgDiv: "#142A18", pastelBg: "#E0F8EB", pastelMid: "#80DBA8", pastelDiv: "#A8ECC4", darkText: "#0A2010", mutedDark: "#1A6030" },
  orange: { h: "#F89050", strong: "#B83C10", bg: "#100800", bgSurf: "#1C1000", bgDiv: "#2E1C00", pastelBg: "#FFF0E0", pastelMid: "#FFAF7A", pastelDiv: "#FFD0B0", darkText: "#28100A", mutedDark: "#904020" },
  pink:   { h: "#F472B6", strong: "#BE185D", bg: "#100610", bgSurf: "#1A0A1A", bgDiv: "#2E1230", pastelBg: "#FCE8F4", pastelMid: "#F4A0C8", pastelDiv: "#F8C4DC", darkText: "#280818", mutedDark: "#901060" },
  gold:   { h: "#F0B830", strong: "#885000", bg: "#0E0A00", bgSurf: "#1A1400", bgDiv: "#2E2200", pastelBg: "#FFF6DC", pastelMid: "#F8CC60", pastelDiv: "#F8E098", darkText: "#201400", mutedDark: "#806000" },
};

export const THEMES = {

  // ── VIOLET ────────────────────────────────────────────────
  /** Domyślny Inspirio — ciemne tło, fioletowy akcent */
  "violet-dark": {
    bg:           BASE.violet.bg,
    surface:      BASE.violet.bgSurf,
    divider:      BASE.violet.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#888888",
    accent:       BASE.violet.h,
    accentSoft:   BASE.violet.pastelBg,
    accentStrong: BASE.violet.strong,
  },
  /** Pastelowe fioletowe tło, ciemny tekst */
  "violet-light": {
    bg:           BASE.violet.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.violet.pastelDiv,
    textMain:     BASE.violet.darkText,
    textMuted:    BASE.violet.mutedDark,
    accent:       BASE.violet.strong,
    accentSoft:   BASE.violet.pastelMid,
    accentStrong: BASE.violet.darkText,
  },

  // ── BLUE ──────────────────────────────────────────────────
  /** Ciemne tło, błękitny akcent */
  "blue-dark": {
    bg:           BASE.blue.bg,
    surface:      BASE.blue.bgSurf,
    divider:      BASE.blue.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#6B8FA8",
    accent:       BASE.blue.h,
    accentSoft:   BASE.blue.pastelBg,
    accentStrong: BASE.blue.strong,
  },
  /** Pastelowe niebieskie tło, ciemny tekst */
  "blue-light": {
    bg:           BASE.blue.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.blue.pastelDiv,
    textMain:     BASE.blue.darkText,
    textMuted:    BASE.blue.mutedDark,
    accent:       BASE.blue.strong,
    accentSoft:   BASE.blue.pastelMid,
    accentStrong: BASE.blue.darkText,
  },

  // ── GREEN ─────────────────────────────────────────────────
  /** Ciemne tło, zielony akcent */
  "green-dark": {
    bg:           BASE.green.bg,
    surface:      BASE.green.bgSurf,
    divider:      BASE.green.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#6A9A72",
    accent:       BASE.green.h,
    accentSoft:   BASE.green.pastelBg,
    accentStrong: BASE.green.strong,
  },
  /** Pastelowe zielone tło, ciemny tekst */
  "green-light": {
    bg:           BASE.green.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.green.pastelDiv,
    textMain:     BASE.green.darkText,
    textMuted:    BASE.green.mutedDark,
    accent:       BASE.green.strong,
    accentSoft:   BASE.green.pastelMid,
    accentStrong: BASE.green.darkText,
  },

  // ── ORANGE ────────────────────────────────────────────────
  /** Ciemne tło, pomarańczowy akcent */
  "orange-dark": {
    bg:           BASE.orange.bg,
    surface:      BASE.orange.bgSurf,
    divider:      BASE.orange.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#AA8855",
    accent:       BASE.orange.h,
    accentSoft:   BASE.orange.pastelBg,
    accentStrong: BASE.orange.strong,
  },
  /** Pastelowe brzoskwiniowe tło, ciemny tekst */
  "orange-light": {
    bg:           BASE.orange.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.orange.pastelDiv,
    textMain:     BASE.orange.darkText,
    textMuted:    BASE.orange.mutedDark,
    accent:       BASE.orange.strong,
    accentSoft:   BASE.orange.pastelMid,
    accentStrong: BASE.orange.darkText,
  },

  // ── PINK ──────────────────────────────────────────────────
  /** Ciemne tło, różowy akcent */
  "pink-dark": {
    bg:           BASE.pink.bg,
    surface:      BASE.pink.bgSurf,
    divider:      BASE.pink.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#B07090",
    accent:       BASE.pink.h,
    accentSoft:   BASE.pink.pastelBg,
    accentStrong: BASE.pink.strong,
  },
  /** Pastelowe różowe tło, ciemny tekst */
  "pink-light": {
    bg:           BASE.pink.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.pink.pastelDiv,
    textMain:     BASE.pink.darkText,
    textMuted:    BASE.pink.mutedDark,
    accent:       BASE.pink.strong,
    accentSoft:   BASE.pink.pastelMid,
    accentStrong: BASE.pink.darkText,
  },

  // ── GOLD ──────────────────────────────────────────────────
  /** Ciemne tło, złoty akcent */
  "gold-dark": {
    bg:           BASE.gold.bg,
    surface:      BASE.gold.bgSurf,
    divider:      BASE.gold.bgDiv,
    textMain:     "#FFFFFF",
    textMuted:    "#9A8855",
    accent:       BASE.gold.h,
    accentSoft:   BASE.gold.pastelBg,
    accentStrong: BASE.gold.strong,
  },
  /** Pastelowe złote tło, ciemny tekst */
  "gold-light": {
    bg:           BASE.gold.pastelBg,
    surface:      "#FFFFFF",
    divider:      BASE.gold.pastelDiv,
    textMain:     BASE.gold.darkText,
    textMuted:    BASE.gold.mutedDark,
    accent:       BASE.gold.strong,
    accentSoft:   BASE.gold.pastelMid,
    accentStrong: BASE.gold.darkText,
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
  const t = THEMES[themeName] ?? THEMES.midnight;
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
