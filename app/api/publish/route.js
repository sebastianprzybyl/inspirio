import { NextResponse } from "next/server";
import { getSupabaseClientOrNull } from "../../../lib/supabase.js";
import { publishPost } from "../../../publisher/instagram.js";

// POST /api/publish
// Body: { id, type, caption, tags, image_url, slides }
export async function POST(request) {
  let postId;
  const supabase = getSupabaseClientOrNull();

  try {
    const body = await request.json();
    postId = body.id;

    const { id, ...postData } = body;

    // Wywołaj publisher — czysty moduł, nie dotyka Supabase
    const { publishedId } = await publishPost(postData);

    // Zaktualizuj status w Supabase jeśli dostępne
    if (supabase && postId) {
      await supabase
        .from("posts")
        .update({
          status: "published",
          published_post_id: publishedId,
          published_at: new Date().toISOString(),
        })
        .eq("id", postId);
    }

    return NextResponse.json({ success: true, publishedId });
  } catch (err) {
    // Oznacz jako failed w Supabase
    if (supabase && postId) {
      await supabase
        .from("posts")
        .update({ status: "failed", error_message: err.message.slice(0, 2000) })
        .eq("id", postId);
    }

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

