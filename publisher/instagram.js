import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = "https://graph.instagram.com";
const __filename = fileURLToPath(import.meta.url);

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak zmiennej ${name}`);
  }
  return value;
}

function getSupabaseClient() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_KEY"));
}

const MOCK_APPROVED_POST = {
  id: "00000000-mock-0000-0000-000000000000",
  type: "carousel",
  caption: "[DRY-RUN] Testowy opis posta — tutaj bedzie caption z Gemini.",
  tags: ["#inspirio", "#dryrun", "#test"],
  image_url: "https://via.placeholder.com/1080",
  slides: [
    { title: "Hook", body: "Zacznij od problemu odbiorcy.", image_url: "https://via.placeholder.com/1080" },
    { title: "Wartosc", body: "3 kroki do wdrozenia.", image_url: "https://via.placeholder.com/1080" },
    { title: "CTA", body: "Zapisz i skomentuj!", image_url: "https://via.placeholder.com/1080" },
  ],
};

function graphUrl(endpoint) {
  return `${GRAPH_BASE}/${GRAPH_VERSION}/${endpoint}`;
}

async function graphGet(endpoint, params = {}) {
  const accessToken = required("INSTAGRAM_ACCESS_TOKEN");
  const url = new URL(graphUrl(endpoint));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta Graph blad [${data.error.code}]: ${data.error.message}`);
  }
  return data;
}

async function graphPost(endpoint, body) {
  const accessToken = required("INSTAGRAM_ACCESS_TOKEN");
  const payload = new URLSearchParams(body);

  const res = await fetch(graphUrl(endpoint), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Meta Graph blad: ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

export function buildCaption(caption, tags = []) {
  const line = [caption, ...(tags || [])].filter(Boolean).join("\n\n");
  return line.slice(0, 2200);
}

async function createMediaContainer({ imageUrl, caption, isCarouselItem = false, children = null }) {
  const igUserId = required("INSTAGRAM_USER_ID");
  const body = {};

  if (children?.length) {
    body.media_type = "CAROUSEL";
    body.children = children.join(",");
    body.caption = caption;
  } else {
    body.image_url = imageUrl;
    if (caption) {
      body.caption = caption;
    }
    if (isCarouselItem) {
      body.is_carousel_item = "true";
    }
  }

  const data = await graphPost(`${igUserId}/media`, body);
  return data.id;
}

/**
 * Czeka aż kontener mediów Instagram będzie gotowy do publikacji.
 * Instagram potrzebuje chwili na przetworzenie obrazu po stworzeniu kontenera.
 * @param {string} creationId - ID kontenera mediów
 * @param {{ maxAttempts?: number, intervalMs?: number }} options
 * @returns {Promise<void>}
 */
async function waitForMediaReady(creationId, { maxAttempts = 20, intervalMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const data = await graphGet(creationId, { fields: "status_code,status" });
    const statusCode = data.status_code;

    if (statusCode === "FINISHED") {
      return; // gotowe do publikacji
    }

    if (statusCode === "ERROR") {
      throw new Error(`Kontener mediów ${creationId} zwrócił błąd przetwarzania (status: ERROR).`);
    }

    if (statusCode === "EXPIRED") {
      throw new Error(`Kontener mediów ${creationId} wygasł przed publikacją (status: EXPIRED).`);
    }

    // statusCode === "IN_PROGRESS" lub inny — czekamy dalej
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    `Kontener mediów ${creationId} nie był gotowy po ${maxAttempts} próbach (${(maxAttempts * intervalMs) / 1000}s).`
  );
}

async function publishContainer(creationId) {
  const igUserId = required("INSTAGRAM_USER_ID");
  await waitForMediaReady(creationId);
  const data = await graphPost(`${igUserId}/media_publish`, { creation_id: creationId });
  return data.id;
}

async function markAsPublished(supabase, postId, publishedPostId) {
  const { error } = await supabase
    .from("posts")
    .update({ status: "published", published_post_id: publishedPostId, published_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    throw new Error(`Nie udalo sie oznaczyc posta jako published: ${error.message}`);
  }
}

async function markAsFailed(supabase, postId, errorMessage) {
  await supabase
    .from("posts")
    .update({ status: "failed", error_message: errorMessage.slice(0, 2000) })
    .eq("id", postId);
}

async function publishSinglePost(post) {
  const caption = buildCaption(post.caption, post.tags);
  const creationId = await createMediaContainer({ imageUrl: post.image_url, caption });
  const publishedId = await publishContainer(creationId);
  return publishedId;
}

async function publishCarousel(post) {
  const caption = buildCaption(post.caption, post.tags);
  const childrenIds = [];

  for (const slide of post.slides || []) {
    if (!slide.image_url) {
      throw new Error("Brak image_url dla slajdu karuzeli.");
    }
    const childCreationId = await createMediaContainer({
      imageUrl: slide.image_url,
      caption: null,
      isCarouselItem: true,
    });
    childrenIds.push(childCreationId);
  }

  if (childrenIds.length < 2) {
    throw new Error("Karuzela musi miec min. 2 slajdy.");
  }

  const carouselCreationId = await createMediaContainer({ children: childrenIds, caption });
  const publishedId = await publishContainer(carouselCreationId);
  return publishedId;
}

/**
 * publishPost — czysty eksport używany przez Next.js API route.
 * Przyjmuje dane posta i publikuje na IG. Nie dotyka Supabase.
 * @param {{ type: string, image_url: string, caption: string, tags: string[], slides: Array }} post
 * @returns {{ publishedId: string }}
 */
export async function publishPost(post) {
  const publishedId =
    post.type === "carousel" ? await publishCarousel(post) : await publishSinglePost(post);
  return { publishedId };
}

export async function testMetaConnection() {
  const igUserId = required("INSTAGRAM_USER_ID");
  console.log("── Meta Graph API — test połączenia (GET only) ─────────────");

  // 1) Sprawdz token przez /me
  const me = await graphGet("me", { fields: "id,name" });
  console.log(`  ✅ Token ważny | FB user id: ${me.id} | ${me.name}`);

  // 2) Pobierz dane konta IG Business
  const ig = await graphGet(igUserId, {
    fields: "id,name,username,followers_count,media_count",
  });
  console.log(`  ✅ Konto IG: @${ig.username} | followers: ${ig.followers_count ?? "n/a"} | posty: ${ig.media_count ?? "n/a"}`);

  // 3) Sprawdz dzienne quota
  try {
    const limit = await graphGet(`${igUserId}/content_publishing_limit`, {
      fields: "config,quota_usage",
    });
    const entry = limit.data?.[0];
    if (entry) {
      const total = entry.config?.quota_total ?? 50;
      const used = entry.quota_usage ?? 0;
      console.log(`  ✅ Quota publikacji: ${used}/${total} zuzyto dzisiaj`);
    }
  } catch {
    console.log("  ⚠️  Quota niedostepna (brak instagram_content_publish lub pierwsze uzycie)");
  }

  return { me, ig };
}

export async function runPublisher({ dryRun = false } = {}) {
  // --- dry-run bez Supabase: uzyj mockowego posta, nie wywoluj API Meta ---
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

  if (dryRun && !hasSupabase) {
    console.log("ℹ️  Tryb dry-run (bez Supabase) — uzycie mockowego posta.\n");

    // Realny call do Meta Graph — test polaczenia (GET only, bez publikacji)
    await testMetaConnection();
    console.log();

    const post = MOCK_APPROVED_POST;
    const caption = buildCaption(post.caption, post.tags);
    const result = {
      id: post.id,
      status: "dry_run",
      type: post.type,
      would_publish: {
        caption_preview: caption.slice(0, 200) + (caption.length > 200 ? "…" : ""),
        slides_count: post.slides?.length ?? 0,
        image_url: post.image_url,
        meta_endpoint: `POST /v22.0/${process.env.INSTAGRAM_USER_ID ?? "{INSTAGRAM_USER_ID}"}/media`,
      },
    };
    return [result];
  }

  // --- normalny tryb: wymaga Supabase ---
  const supabase = getSupabaseClient();

  // W trybie dry-run z Supabase rowniez testuj polaczenie z Meta Graph
  if (dryRun) {
    await testMetaConnection();
    console.log();
  }

  const { data: approvedPosts, error } = await supabase
    .from("posts")
    .select("id, type, caption, tags, image_url, slides")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(`Blad odczytu approved postow: ${error.message}`);
  }

  const results = [];
  for (const post of approvedPosts || []) {
    try {
      if (dryRun) {
        // dry-run z Supabase: pokaz co by opublikowano, bez wywolania Meta API
        const caption = buildCaption(post.caption, post.tags);
        results.push({
          id: post.id,
          status: "dry_run",
          type: post.type,
          would_publish: {
            caption_preview: caption.slice(0, 200) + (caption.length > 200 ? "…" : ""),
            slides_count: post.slides?.length ?? 0,
            image_url: post.image_url,
          },
        });
        continue;
      }

      const publishedId = post.type === "carousel" ? await publishCarousel(post) : await publishSinglePost(post);
      await markAsPublished(supabase, post.id, publishedId);
      results.push({ id: post.id, status: "published", publishedId });
    } catch (publishError) {
      await markAsFailed(supabase, post.id, publishError.message);
      results.push({ id: post.id, status: "failed", error: publishError.message });
    }
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const dryRun = process.env.PUBLISH_DRY_RUN === "true" || process.argv.includes("--dry-run");
  runPublisher({ dryRun })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}


