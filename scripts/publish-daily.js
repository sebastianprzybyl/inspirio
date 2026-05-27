/**
 * publish-daily.js
 *
 * Publikuje posty z dzisiaj na Instagramie:
 * 1. Najpierw publikuje feed posts (carousel + single)
 * 2. Czeka określoną ilość minut
 * 3. Następnie publikuje stories
 *
 * Uzycie:
 *   node scripts/publish-daily.js [--dry-run] [--delay-minutes=5]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getSupabaseClient } from "../lib/supabase.js";
import { publishPost, buildCaption } from "../publisher/instagram.js";

async function markAsPublished(supabase, postId, publishedPostId) {
  const { error } = await supabase
    .from("posts")
    .update({ status: "published", published_post_id: publishedPostId, published_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    throw new Error(`Nie udało się oznaczyć posta jako published: ${error.message}`);
  }
}

async function markAsFailed(supabase, postId, errorMessage) {
  await supabase
    .from("posts")
    .update({ status: "failed", error_message: errorMessage.slice(0, 2000) })
    .eq("id", postId);
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

async function getPostsFromToday() {
  const supabase = getSupabaseClient();
  const { startISO, endISO } = getTodayDateRange();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, type, caption, tags, image_url, slides, created_at")
    .eq("status", "pending")
    .gte("created_at", startISO)
    .lt("created_at", endISO)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Błąd pobierania postów z dzisiaj: ${error.message}`);
  }

  return posts || [];
}

function separatePosts(posts) {
  const feedPosts = posts.filter((p) => p.type !== "story");
  const storyPosts = posts.filter((p) => p.type === "story");
  return { feedPosts, storyPosts };
}

async function publishPostsWithDelay({ dryRun = false, delayMinutes = 5 }) {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║       Publikowanie dziennych postów na Instagramie    ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const supabase = getSupabaseClient();
  const todayPosts = await getPostsFromToday();

  if (todayPosts.length === 0) {
    console.log("ℹ️  Brak pending postów z dzisiaj.\n");
    return { feedResults: [], storyResults: [] };
  }

  const { feedPosts, storyPosts } = separatePosts(todayPosts);

  console.log(`📊 Posty z dzisiaj: ${feedPosts.length} feed + ${storyPosts.length} stories\n`);

  // --- publikuj feed posts ---
  const feedResults = [];
  if (feedPosts.length > 0) {
    console.log("📱 Publikowanie feed postów...\n");
    for (const post of feedPosts) {
      try {
        if (dryRun) {
          const caption = buildCaption(post.caption, post.tags);
          feedResults.push({
            id: post.id,
            status: "dry_run",
            type: post.type,
            preview: caption.slice(0, 100) + (caption.length > 100 ? "…" : ""),
          });
          console.log(`  ✅ [DRY-RUN] ${post.type.toUpperCase()} #${post.id.slice(0, 8)}`);
        } else {
          const { publishedId } = await publishPost(post);
          await markAsPublished(supabase, post.id, publishedId);
          feedResults.push({
            id: post.id,
            status: "published",
            publishedId,
            type: post.type,
          });
          console.log(`  ✅ ${post.type.toUpperCase()} opublikowany (#${publishedId.slice(0, 8)})`);
        }
      } catch (err) {
        if (!dryRun) {
          await markAsFailed(supabase, post.id, err.message);
        }
        feedResults.push({
          id: post.id,
          status: "failed",
          error: err.message,
          type: post.type,
        });
        console.log(`  ❌ ${post.type.toUpperCase()} #${post.id.slice(0, 8)}: ${err.message}`);
      }
    }
    console.log();
  }

  // --- czekaj przed publikowaniem stories ---
  if (storyPosts.length > 0) {
    const delayMs = delayMinutes * 60 * 1000;
    console.log(`⏳ Czekanie ${delayMinutes} minut przed publikowaniem stories...\n`);

    if (!dryRun) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else {
      console.log(`  [DRY-RUN] Opominięcie ${delayMinutes} min delay\n`);
    }

    // --- publikuj stories ---
    console.log("📖 Publikowanie stories...\n");
    const storyResults = [];
    for (const story of storyPosts) {
      try {
        if (dryRun) {
          storyResults.push({
            id: story.id,
            status: "dry_run",
            type: "story",
            slides: story.slides?.length ?? 1,
          });
          console.log(`  ✅ [DRY-RUN] STORY #${story.id.slice(0, 8)} (${story.slides?.length ?? 1} slajdów)`);
        } else {
          const { publishedId } = await publishPost(story);
          await markAsPublished(supabase, story.id, publishedId);
          storyResults.push({
            id: story.id,
            status: "published",
            publishedId,
            type: "story",
          });
          console.log(`  ✅ STORY opublikowany (#${publishedId.slice(0, 8)})`);
        }
      } catch (err) {
        if (!dryRun) {
          await markAsFailed(supabase, story.id, err.message);
        }
        storyResults.push({
          id: story.id,
          status: "failed",
          error: err.message,
          type: "story",
        });
        console.log(`  ❌ STORY #${story.id.slice(0, 8)}: ${err.message}`);
      }
    }
    return { feedResults, storyResults };
  }

  return { feedResults, storyResults: [] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const dryRun = process.env.PUBLISH_DRY_RUN === "true" || process.argv.includes("--dry-run");
  const delayMatch = process.argv.find((arg) => arg.startsWith("--delay-seconds="));
  const delaySeconds = delayMatch ? parseInt(delayMatch.split("=")[1], 10) : 30;
  const delayMinutes = delaySeconds / 60;

  publishPostsWithDelay({ dryRun, delayMinutes })
    .then((result) => {
      console.log("\n📊 Podsumowanie:");
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error("❌ Błąd:", error.message);
      process.exitCode = 1;
    });
}

export { publishPostsWithDelay };
