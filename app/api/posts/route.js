import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabase.js";

// GET /api/posts?status=pending
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, type, topic, caption, tags, image_url, slides, status, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/posts  { id, status, caption? }
export async function PATCH(request) {
  try {
    const { id, status, caption } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Wymagane pola: id, status" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const update = { status };
    if (caption !== undefined) update.caption = caption;

    const { data, error } = await supabase
      .from("posts")
      .update(update)
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

