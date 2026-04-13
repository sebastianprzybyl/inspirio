/**
 * graphics/themes.js
 *
 * Palety kolorystyczne dla szablonów graficznych.
 * Každý motyw nadpisuje zmienne CSS z brand.css przez wstrzyknięcie <style>
 * w Puppeteer — żaden plik HTML nie wymaga zmian.
 */

export const THEMES = {

  /** Domyślny — ciemny fiolet Inspirio */
  midnight: {
    bg:           "#0E0E10",
    surface:      "#17171C",
    divider:      "#2A2A2E",
    textMain:     "#FFFFFF",
    textMuted:    "#888888",
    accent:       "#7F77DD",
    accentSoft:   "#EEEDFE",
    accentStrong: "#3C3489",
  },

  /** Głęboki błękit — morski spokój */
  ocean: {
    bg:           "#040D1A",
    surface:      "#0A1628",
    divider:      "#152035",
    textMain:     "#FFFFFF",
    textMuted:    "#6B8FA8",
    accent:       "#38BDF8",
    accentSoft:   "#E0F2FE",
    accentStrong: "#0369A1",
  },

  /** Leśna zieleń — organicznie i świeżo */
  forest: {
    bg:           "#050F07",
    surface:      "#0A1A0D",
    divider:      "#152A18",
    textMain:     "#FFFFFF",
    textMuted:    "#6A9A72",
    accent:       "#4ADE80",
    accentSoft:   "#DCFCE7",
    accentStrong: "#15803D",
  },

  /** Żar — pomarańczowa energia */
  ember: {
    bg:           "#100800",
    surface:      "#1C1000",
    divider:      "#2E1C00",
    textMain:     "#FFFFFF",
    textMuted:    "#AA8855",
    accent:       "#FB923C",
    accentSoft:   "#FFF7ED",
    accentStrong: "#C2410C",
  },

  /** Róż — miękki, odważny */
  rose: {
    bg:           "#100610",
    surface:      "#1A0A1A",
    divider:      "#2E1230",
    textMain:     "#FFFFFF",
    textMuted:    "#B07090",
    accent:       "#F472B6",
    accentSoft:   "#FCE7F3",
    accentStrong: "#BE185D",
  },

  /** Złoto — premium i aspiracyjnie */
  gold: {
    bg:           "#0E0B00",
    surface:      "#1A1500",
    divider:      "#2E2500",
    textMain:     "#FFFFFF",
    textMuted:    "#9A8855",
    accent:       "#FBBF24",
    accentSoft:   "#FFFBEB",
    accentStrong: "#92400E",
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
