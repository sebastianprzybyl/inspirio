/**
 * check-instagram.js
 *
 * Bezinwazyjny diagnostyk integracji z Meta Graph API.
 * Wykonuje wylacznie zapytania GET — nic nie tworzy, nic nie publikuje.
 *
 * Uzycie:
 *   node scripts/check-instagram.js
 */

import dotenv from "dotenv";
dotenv.config();

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID;

// ─── helpers ────────────────────────────────────────────────────────────────

function ok(label, value) {
  console.log(`  ✅ ${label}: ${value}`);
}
function warn(label, value) {
  console.log(`  ⚠️  ${label}: ${value}`);
}
function fail(label, value) {
  console.log(`  ❌ ${label}: ${value}`);
}

async function graphGet(path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (data.error) {
    throw Object.assign(new Error(data.error.message), {
      code: data.error.code,
      subcode: data.error.error_subcode,
      type: data.error.type,
    });
  }
  return data;
}

// ─── kroki diagnostyczne ────────────────────────────────────────────────────

async function checkEnvVars() {
  console.log("\n── 1) Zmienne środowiskowe ─────────────────────────────────");
  let allOk = true;

  if (token) {
    ok("INSTAGRAM_ACCESS_TOKEN", `${token.slice(0, 12)}…`);
  } else {
    fail("INSTAGRAM_ACCESS_TOKEN", "BRAK — ustaw w .env");
    allOk = false;
  }

  if (userId) {
    ok("INSTAGRAM_USER_ID", userId);
  } else {
    fail("INSTAGRAM_USER_ID", "BRAK — ustaw w .env");
    allOk = false;
  }

  return allOk;
}

async function checkTokenDebug() {
  console.log("\n── 2) Weryfikacja tokenu (/debug_token) ────────────────────");
  // debug_token wymaga app_access_token lub wlasnego tokenu jako input_token
  // Uzywamy /me jako prostszego odpowiednika
  try {
    const me = await graphGet("me", { fields: "id,name" });
    ok("Token wazny, user id z tokenu", me.id);
    ok("Nazwa konta Facebook/Meta", me.name);

    if (userId && me.id !== userId) {
      warn(
        "UWAGA",
        `ID z tokenu (${me.id}) rozni sie od INSTAGRAM_USER_ID (${userId}). ` +
          "To moze byc OK — IG Business ID rozni sie od FB user ID.",
      );
    }
    return me;
  } catch (err) {
    fail("Token niepoprawny lub wygasly", err.message);
    if (err.code === 190) {
      console.log("     → Wygeneruj nowy token w Meta Developers (ważny 60 dni).");
    }
    return null;
  }
}

async function checkInstagramAccount() {
  console.log("\n── 3) Dane konta Instagram Business ────────────────────────");
  try {
    const ig = await graphGet(userId, {
      fields: "id,name,username,biography,followers_count,media_count,profile_picture_url",
    });

    ok("ID konta IG", ig.id);
    ok("Nazwa", ig.name);
    ok("Username", `@${ig.username}`);
    if (ig.followers_count !== undefined) ok("Obserwujacy", ig.followers_count);
    if (ig.media_count !== undefined) ok("Liczba postow", ig.media_count);
    return ig;
  } catch (err) {
    fail("Blad pobierania danych konta IG", err.message);
    if (err.message.includes("OAuthException")) {
      console.log("     → Brak uprawnien instagram_basic lub zly INSTAGRAM_USER_ID.");
    }
    return null;
  }
}

async function checkPublishingPermissions() {
  console.log("\n── 4) Uprawnienia do publikacji ────────────────────────────");
  // graph.instagram.com nie obsluguje /me/permissions — weryfikujemy posrednio
  // przez probe odczytu content_publishing_limit (wymaga instagram_content_publish)
  try {
    await graphGet(`${userId}/content_publishing_limit`, { fields: "quota_usage" });
    ok("Uprawnienie", "instagram_content_publish (potwierdzone przez quota endpoint)");
    return ["instagram_content_publish"];
  } catch (err) {
    if (err.message.includes("200") || err.message.includes("permission")) {
      fail("Brak uprawnienia", "instagram_content_publish");
      console.log("     → Dodaj uprawnienie w swojej aplikacji Meta Developers.");
    } else {
      ok("Uprawnienie", "instagram_basic (token dziala)");
      console.log(`  ℹ️  Quota endpoint: ${err.message}`);
    }
    return [];
  }
}

async function checkPublishingQuota() {
  console.log("\n── 5) Quota publikacji (dziennie: max 50) ──────────────────");
  try {
    const data = await graphGet(`${userId}/content_publishing_limit`, {
      fields: "config,quota_usage",
    });

    const entry = data.data?.[0];
    if (entry) {
      const quota = entry.config?.quota_total ?? 50;
      const used = entry.quota_usage ?? 0;
      const left = quota - used;

      if (left > 10) {
        ok("Zuzyto / limit", `${used} / ${quota}`);
        ok("Pozostalo na dzis", left);
      } else if (left > 0) {
        warn("Zuzyto / limit", `${used} / ${quota}`);
        warn("Pozostalo na dzis (malo!)", left);
      } else {
        fail("Dzienny limit wyczerpany", `${used} / ${quota}`);
      }
    } else {
      console.log("  ℹ️  Brak danych o limicie (konto moze nie miec jeszcze historii).");
    }
  } catch (err) {
    fail("Blad sprawdzania quota", err.message);
    if (err.message.includes("instagram_content_publish")) {
      console.log("     → Dodaj uprawnienie instagram_content_publish w aplikacji Meta.");
    }
  }
}

async function checkTokenExpiry() {
  console.log("\n── 6) Czas waznosci tokenu ─────────────────────────────────");
  // Krotki token jest JWT — mozna zdekodowac bez biblioteki
  // Dlugi token nie jest JWT, wiec probujemy odczyt z /debug_token
  // Bez app_secret uzywamy heurystyki: jesli token zaczyna sie od IGAAMfn — to long-lived
  if (!token) return;

  if (token.startsWith("IGAAM") || token.startsWith("IGQVM") || token.startsWith("EAAg")) {
    ok("Typ tokenu", "Long-lived access token (wazny ~60 dni od wygenerowania)");
    console.log(
      "  ℹ️  Odswiezaj token co ~50 dni przez: GET /oauth/access_token?grant_type=fb_exchange_token",
    );
  } else {
    warn("Typ tokenu", "Moze byc short-lived (wazny 1h) — zamien na long-lived token.");
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Inspirio — diagnostyka integracji z Instagramem      ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const envOk = await checkEnvVars();
  if (!envOk) {
    console.log("\n❌ Ustaw brakujace zmienne w .env i sprobuj ponownie.\n");
    process.exitCode = 1;
    return;
  }

  await checkTokenDebug();
  await checkInstagramAccount();
  await checkPublishingPermissions();
  await checkPublishingQuota();
  await checkTokenExpiry();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Jesli wszystkie kroki maja ✅ — integracja jest gotowa.");
  console.log("  Aby przetestowac publisher bez publikacji:");
  console.log("    $env:PUBLISH_DRY_RUN='true'; npm run publish");
  console.log("══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\nNiespodziewany blad:", err.message);
  process.exitCode = 1;
});

