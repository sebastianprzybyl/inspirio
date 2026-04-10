import { getSupabaseClient } from "../lib/supabase.js";
import PostGrid from "./components/PostGrid";

/**
 * Pobiera posty pending bezpośrednio z Supabase (server-side).
 * Działa bez /api/posts — zero waterfalla fetch na pierwszym ładowaniu.
 */
async function getPendingPosts() {
  try {
    const { data, error } = await getSupabaseClient()
      .from("posts")
      .select("id, type, topic, caption, tags, image_url, slides, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Błąd SSR fetch posts:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    // Brak zmiennych środowiskowych (np. dev bez .env)
    console.warn("SSR Supabase niedostępny:", err.message);
    return [];
  }
}

/**
 * Server Component — renderuje panel po stronie serwera.
 * Dane postów trafiają do PostGrid jako props (brak useEffect na mount).
 */
export default async function PanelPage() {
  const initialPosts = await getPendingPosts();
  return <PostGrid initialPosts={initialPosts} />;
}

