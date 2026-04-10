import { NextResponse } from "next/server";

async function sessionToken(password) {
  const data = new TextEncoder().encode(password + ":inspirio-panel-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// POST /api/auth — logowanie
export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));

  if (!password) {
    return NextResponse.json({ error: "Brak hasła" }, { status: 400 });
  }

  const expected = process.env.PANEL_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "PANEL_PASSWORD nie jest ustawiony w zmiennych środowiskowych" },
      { status: 500 },
    );
  }

  if (password !== expected) {
    // Sztuczne opóźnienie — ochrona przed brute force
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  const token = await sessionToken(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("panel_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 dni
    path: "/",
  });
  return response;
}

// DELETE /api/auth — wylogowanie
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("panel_auth");
  return response;
}

