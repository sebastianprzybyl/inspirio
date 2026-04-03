/**
 * test-publish.js
 *
 * JEDNORAZOWY test end-to-end publikacji na Instagram.
 * Publikuje PRAWDZIWY post na Twoim koncie — używaj tylko raz do weryfikacji!
 *
 * Uzycie:
 *   node scripts/test-publish.js
 *   node scripts/test-publish.js --dry-run   ← tylko tworzy container, nie publikuje
 */

import dotenv from "dotenv";
dotenv.config();

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

// ─── Dane testowego posta ────────────────────────────────────────────────────
// Zmień IMAGE_URL na dowolny publiczny obraz HTTPS 1080×1080 (JPEG lub PNG)
const TEST_IMAGE_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1080&fit=crop";

const TEST_CAPTION = [
  "🧪 Post testowy — Inspirio Automation",
  "",
  "Jeśli widzisz ten post, integracja z Instagram Graph API działa poprawnie ✅",
  "",
  "#test #inspirio #automation",
].join("\n");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Brak zmiennej środowiskowej: ${name}`);
  return value;
}

function log(emoji, label, value = "") {
  console.log(`  ${emoji} ${label}${value ? `: ${value}` : ""}`);
}

async function graphPost(endpoint, body) {
  const accessToken = required("INSTAGRAM_ACCESS_TOKEN");
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`[${data.error.code}] ${data.error.message}`);
  }
  return data;
}

async function graphGet(endpoint, params = {}) {
  const accessToken = required("INSTAGRAM_ACCESS_TOKEN");
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(`[${data.error.code}] ${data.error.message}`);
  return data;
}

// ─── Kroki publikacji ────────────────────────────────────────────────────────

async function step1_verifyAccount(igUserId) {
  console.log("\n── Krok 1: Weryfikacja konta ───────────────────────────────");
  const account = await graphGet(igUserId, { fields: "id,username,name" });
  log("✅", "Konto", `@${account.username} (${account.name})`);
  return account;
}

async function step2_createContainer(igUserId) {
  console.log("\n── Krok 2: Tworzenie media container ───────────────────────");
  log("ℹ️", "Obraz", TEST_IMAGE_URL);
  log("ℹ️", "Caption", TEST_CAPTION.split("\n")[0] + "…");

  const data = await graphPost(`${igUserId}/media`, {
    image_url: TEST_IMAGE_URL,
    caption: TEST_CAPTION,
  });

  log("✅", "Container ID", data.id);
  log("ℹ️", "Container wygaśnie automatycznie za 24h jeśli nie zostanie opublikowany");
  return data.id;
}

async function step3_publish(igUserId, creationId) {
  console.log("\n── Krok 3: Publikacja ──────────────────────────────────────");
  const data = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
  });
  log("✅", "Post opublikowany! ID", data.id);
  log("🔗", "Podgląd", `https://www.instagram.com/p/${data.id}/`);
  return data.id;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const igUserId = required("INSTAGRAM_USER_ID");

  console.log("╔══════════════════════════════════════════════════════════╗");
  if (isDryRun) {
    console.log("║   Inspirio — test publikacji (DRY-RUN, bez publikacji)   ║");
  } else {
    console.log("║   Inspirio — test publikacji REALNEGO posta na IG        ║");
  }
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (!isDryRun) {
    console.log("\n⚠️  UWAGA: Ten skrypt opublikuje PRAWDZIWY post na @so_simple_picture.");
    console.log("   Aby tylko przetestować tworzenie containera bez publikacji, użyj:");
    console.log("   node scripts/test-publish.js --dry-run\n");
  }

  try {
    await step1_verifyAccount(igUserId);
    const containerId = await step2_createContainer(igUserId);

    if (isDryRun) {
      console.log("\n── Dry-run zakończony ──────────────────────────────────────");
      log("✅", "Container utworzony poprawnie (wygaśnie za 24h)");
      log("ℹ️", "Pełna publikacja", "node scripts/test-publish.js (bez --dry-run)");
    } else {
      await step3_publish(igUserId, containerId);
      console.log("\n── Test zakończony pomyślnie ────────────────────────────────");
      log("✅", "Cały przepływ create → publish działa");
      log("ℹ️", "Możesz teraz ustawić PUBLISH_DRY_RUN=false w .env dla automatycznej publikacji");
    }
  } catch (err) {
    console.error(`\n❌ Błąd: ${err.message}`);

    if (err.message.includes("190")) {
      console.error("   → Token wygasł lub jest nieprawidłowy. Uruchom: npm run check:instagram");
    } else if (err.message.includes("2207026")) {
      console.error("   → Obraz niedostępny publicznie. Zmień TEST_IMAGE_URL w tym skrypcie.");
    } else if (err.message.includes("9007")) {
      console.error("   → Dzienny limit publikacji wyczerpany (100/dzień).");
    }

    process.exitCode = 1;
  }
}

main();

