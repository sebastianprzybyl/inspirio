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

// ─────────────────────────────────────────────────────────────────
// Helper — wspólna walidacja struktury postRecord
// ─────────────────────────────────────────────────────────────────
function assertPostRecord(result, expectedType) {
  assert.ok(typeof result.topic === "string" && result.topic.length > 0, "Brak tematu");

  const post = result.generated;
  assert.ok(post != null, "Brak pola generated");
  assert.equal(post.status, "pending", "Status powinien być 'pending'");
  assert.ok(typeof post.caption === "string" && post.caption.length > 0, "Brak caption");
  assert.ok(Array.isArray(post.tags), "tags powinny być tablicą");
  assert.ok(Array.isArray(post.slides) && post.slides.length >= 1, "Brak slajdów");

  if (expectedType) {
    assert.equal(post.type, expectedType, `Typ powinien być "${expectedType}"`);
  } else {
    assert.ok(["post", "carousel", "story"].includes(post.type), `Nieznany typ: "${post.type}"`);
  }

  for (const slide of post.slides) {
    const id = `Slajd ${slide.index}`;
    assert.ok(
      typeof slide.local_path === "string" || typeof slide.image_url === "string",
      `${id}: brak local_path ani image_url — rendering nie zadziałał`,
    );
  }

  assert.ok(result.saved?.dryRun === true, "W trybie dryRun saved.dryRun powinno być true");
}

// ─────────────────────────────────────────────────────────────────
// TEST 1: Carousel (domyślny flow)
// ─────────────────────────────────────────────────────────────────
test(
  "runGenerator carousel — pełne flow (dryRun: bez Supabase, bez uploadu)",
  { timeout: 120_000 },
  async (t) => {
    t.diagnostic(HAS_GEMINI ? "🔑 Gemini API + Puppeteer" : "⚠️  Mock AI + Puppeteer");

    let result;
    try {
      result = await runGenerator({ dryRun: true, contentType: "carousel" });
    } catch (err) {
      const msg = err?.message ?? String(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE")) {
        t.diagnostic(`⚠️  Gemini tymczasowo niedostępny — pomijam (${msg.slice(0, 80)})`);
        return;
      }
      throw err;
    }

    assertPostRecord(result, null);
    assert.ok(["carousel", "post"].includes(result.generated.type), "Oczekiwano carousel lub post");

    t.diagnostic(`✅ Typ: ${result.generated.type} | Slajdów: ${result.generated.slides.length}`);
    t.diagnostic(`   Temat: "${result.topic}"`);
    t.diagnostic(`   Caption: ${result.generated.caption.slice(0, 80)}...`);
    for (const s of result.generated.slides) {
      t.diagnostic(`   [${s.index}] ${s.title} → ${s.local_path ?? s.image_url}`);
    }
  },
);

// ─────────────────────────────────────────────────────────────────
// TEST 2: Story (nowy flow)
// ─────────────────────────────────────────────────────────────────
test(
  "runGenerator story — pełne flow (dryRun: bez Supabase, bez uploadu)",
  { timeout: 120_000 },
  async (t) => {
    t.diagnostic(HAS_GEMINI ? "🔑 Gemini API + Puppeteer" : "⚠️  Mock AI + Puppeteer");

    let result;
    try {
      result = await runGenerator({ dryRun: true, contentType: "story" });
    } catch (err) {
      const msg = err?.message ?? String(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE")) {
        t.diagnostic(`⚠️  Gemini tymczasowo niedostępny — pomijam (${msg.slice(0, 80)})`);
        return;
      }
      throw err;
    }

    assertPostRecord(result, "story");

    // Story-specyficzne: każdy slajd musi mieć pole "type"
    const VALID_SLIDE_TYPES = ["hook", "value", "quote", "cta"];
    for (const slide of result.generated.slides) {
      assert.ok(
        VALID_SLIDE_TYPES.includes(slide.type),
        `Slajd ${slide.index}: nieznany type "${slide.type}"`,
      );
    }

    t.diagnostic(`✅ Typ: story | Slajdów: ${result.generated.slides.length}`);
    t.diagnostic(`   Temat: "${result.topic}"`);
    t.diagnostic(`   Caption: ${result.generated.caption.slice(0, 80)}...`);
    for (const s of result.generated.slides) {
      t.diagnostic(`   [${s.index}] type=${s.type} → ${s.local_path ?? s.image_url}`);
    }
  },
);

