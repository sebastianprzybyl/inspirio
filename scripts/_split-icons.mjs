/**
 * Rozdziela pixel_instagram_zoomed_out.svg na osobne pliki ikon,
 * każdy w formacie 150x150 (square) gotowym do użycia jako awatar IG.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "../public/pixel_instagram_zoomed_out.svg");
const outDir = path.join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

const raw = readFileSync(src, "utf-8");
const lines = raw.split("\n");

// Znajdź indeksy poszczególnych <g transform="translate(...)">
const groups = [];
let depth = 0;
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (/<!--\s*=====\s*(WERSJA \d+ \w+|SUPER MAŁA[^=]*)/.test(line)) {
    const m = line.match(/<!--\s*=====\s*([^=]+?)\s*=====/);
    const label = m ? m[1].trim() : `variant_${groups.length + 1}`;
    current = { label, startComment: i, lines: [] };
    groups.push(current);
    depth = 0;
  }

  if (current && i > current.startComment) {
    // Policz zagłębienie <g> żeby wiedzieć kiedy koniec
    const opens = (line.match(/<g[\s>]/g) || []).length;
    const closes = (line.match(/<\/g>/g) || []).length;

    if (depth === 0 && opens > 0) depth = 1;

    current.lines.push(line);

    if (depth > 0) {
      depth += opens;
      depth -= closes;
      if (depth <= 0) {
        current = null;
        depth = 0;
      }
    }
  }
}

// Konfiguracja każdego wariantu
const configs = {
  "WERSJA 1 DARK — mała": {
    file: "icon-dark.svg",
    outerBg: "#0d0d0d",
    contentW: 100, contentH: 120,
    canvas: 150,
  },
  "WERSJA 2 LIGHT": {
    file: "icon-light.svg",
    outerBg: "#f0efff",
    contentW: 100, contentH: 120,
    canvas: 150,
  },
  "WERSJA 3 OUTLINE": {
    file: "icon-outline.svg",
    outerBg: "#0d0d0d",
    contentW: 100, contentH: 120,
    canvas: 150,
  },
  "SUPER MAŁA — thumbnail size": {
    file: "icon-thumbnail.svg",
    outerBg: "#0d0d0d",
    contentW: 60, contentH: 72,
    canvas: 100,
  },
};

for (const g of groups) {
  const cfg = configs[g.label];
  if (!cfg) {
    console.warn(`Brak konfiguracji dla: "${g.label}"`);
    continue;
  }

  const { file, outerBg, contentW, contentH, canvas } = cfg;

  // Wyśrodkowanie treści w kwadracie
  const tx = Math.round((canvas - contentW) / 2);
  const ty = Math.round((canvas - contentH) / 2);

  // Wyjmij zawartość <g> i zamień translate(x,y) na nasze wyśrodkowanie
  const gLines = g.lines
    .map((line) => {
      // Usuń oryginalny translate (offsety z połączonego pliku)
      return line.replace(
        /(<g\s[^>]*?)transform="translate\(\d+,\s*\d+\)"/,
        `$1transform="translate(${tx}, ${ty})"`
      );
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}">
  <!-- tło awatara — ten sam kolor co tło ikony, bezszwowy wygląd w kółku IG -->
  <rect width="${canvas}" height="${canvas}" fill="${outerBg}"/>
${gLines}
</svg>`;

  const outPath = path.join(outDir, file);
  writeFileSync(outPath, svg, "utf-8");
  console.log(`✓ ${file}  (${canvas}x${canvas}, tx=${tx} ty=${ty}) — "${g.label}"`);
}
