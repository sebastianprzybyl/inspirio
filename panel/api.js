function getConfig() {
  const config = window.PANEL_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Ustaw panel/config.js (supabaseUrl i supabaseAnonKey).");
  }
  return config;
}

async function request(path, options = {}) {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function loadPendingPosts() {
  return request("posts?status=eq.pending&order=created_at.desc");
}

export async function updatePost(id, status, caption) {
  const payload = { status };
  if (typeof caption === "string") {
    payload.caption = caption;
  }

  return request(`posts?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

