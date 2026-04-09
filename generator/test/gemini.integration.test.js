/**
 * Test integracyjny generatora — odpowiednik pełnego flow GitHub Actions.
 *
 * Uruchomienie:
 *   npm run test:gemini          (lub: node generator/test/gemini.integration.test.js)
 *
 * - Bez GEMINI_API_KEY: używa danych mockowych (testuje Puppeteer rendering)
 * - Z GEMINI_API_KEY:   wywołuje prawdziwe Gemini API + renderuje grafiki
 * - W obu przypadkach: dryRun=true → brak zapisu do Supabase, brak uploadu
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { runGenerator } from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const HAS_GEMINI = Boolean(process.env.GEMINI_API_KEY);

test(
  "runGenerator — pełne flow (dryRun: bez Supabase, bez uploadu)",
  { timeout: 120_000 },
  async (t) => {
    t.diagnostic(
      HAS_GEMINI
        ? "🔑 GEMINI_API_KEY ustawiony — prawdziwe AI + Puppeteer"
        : "⚠️  Brak GEMINI_API_KEY — mock AI + Puppeteer",
    );

    let result;
    try {
      result = await runGenerator({ dryRun: true });
    } catch (err) {
      const msg = err?.message ?? String(err);
      const isTransient =
        msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("503") || msg.includes("UNAVAILABLE");
      if (isTransient) {
        t.diagnostic(`⚠️  Gemini tymczasowo niedostępny — pomijam test (${msg.slice(0, 100)})`);
        return; // nie fail — problem infrastrukturalny, nie błąd kodu
      }
      throw err;
    }

    // ── Weryfikacja struktury wyniku ──────────────────────────────
    assert.ok(typeof result.topic === "string" && result.topic.length > 0, "Brak tematu");

    const post = result.generated;
    assert.ok(post != null, "Brak pola generated");
    assert.equal(post.status, "pending", "Status powinien być 'pending'");
    assert.ok(["post", "carousel"].includes(post.type), `Nieznany typ posta: "${post.type}"`);
    assert.ok(typeof post.caption === "string" && post.caption.length > 0, "Brak caption");
    assert.ok(Array.isArray(post.tags), "tags powinny być tablicą");
    assert.ok(Array.isArray(post.slides) && post.slides.length >= 1, "Brak slajdów");

    // ── Weryfikacja slajdów ───────────────────────────────────────
    for (const slide of post.slides) {
      const id = `Slajd ${slide.index}`;
      assert.ok(typeof slide.title === "string" && slide.title.length > 0, `${id}: brak title`);
      assert.ok(typeof slide.body === "string" && slide.body.length > 0, `${id}: brak body`);
      assert.ok(
        typeof slide.local_path === "string" || typeof slide.image_url === "string",
        `${id}: brak local_path ani image_url — rendering nie zadziałał`,
      );
    }

    // ── dryRun = brak Supabase ────────────────────────────────────
    assert.ok(result.saved?.dryRun === true, "W trybie dryRun saved.dryRun powinno być true");

    // ── Podsumowanie ──────────────────────────────────────────────
    t.diagnostic(`✅ Temat:   "${result.topic}"`);
    t.diagnostic(`   Typ:     ${post.type} | Slajdów: ${post.slides.length}`);
    t.diagnostic(`   Caption: ${post.caption.slice(0, 80)}...`);
    t.diagnostic(`   Tagi:    ${post.tags.join(", ")}`);
    for (const s of post.slides) {
      t.diagnostic(`   [${s.index}] ${s.title} → ${s.local_path ?? s.image_url}`);
    }
  },
);
