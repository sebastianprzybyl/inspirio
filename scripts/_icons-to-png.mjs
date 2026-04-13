import puppeteer from "puppeteer";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "../public/icons");

const svgFiles = readdirSync(iconsDir).filter(f => f.endsWith(".svg"));
console.log("Pliki do przetworzenia:", svgFiles);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

for (const svgFile of svgFiles) {
  const page = await browser.newPage();
  try {
    const svgPath = path.join(iconsDir, svgFile);
    const svgContent = readFileSync(svgPath, "utf-8");
    const svgBase64 = Buffer.from(svgContent).toString("base64");

    const m = svgContent.match(/viewBox="0 0 (\d+) (\d+)"/);
    const size = m ? parseInt(m[1]) : 150;

    await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0;padding:0; }
      body { width:${size}px;height:${size}px;background:transparent; }
      img { width:${size}px;height:${size}px;display:block; }
    </style></head><body>
      <img src="data:image/svg+xml;base64,${svgBase64}" />
    </body></html>`;
    await page.setContent(html, { waitUntil: "networkidle0" });

    const outFile = svgFile.replace(".svg", ".png");
    const outPath = path.join(iconsDir, outFile);
    await page.screenshot({ path: outPath, omitBackground: true, type: "png" });
    console.log(`✓ ${outFile} (${size}x${size} @2x)`);
  } catch (err) {
    console.error(`✗ ${svgFile}:`, err.message);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log("Gotowe.");
