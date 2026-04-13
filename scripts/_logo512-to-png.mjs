import puppeteer from "puppeteer";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(__dirname, "../public/logo.svg"), "utf-8");
const b64 = Buffer.from(svg).toString("base64");

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
await page.setContent(
  `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;}body{width:512px;height:512px;}img{width:512px;height:512px;display:block;}</style></head><body><img src="data:image/svg+xml;base64,${b64}"/></body></html>`,
  { waitUntil: "networkidle0" }
);
await page.screenshot({ path: path.join(__dirname, "../public/logo-512.png"), type: "png" });
console.log("✓ public/logo-512.png (512x512)");
await browser.close();
