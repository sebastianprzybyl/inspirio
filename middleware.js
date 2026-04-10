import { NextResponse } from "next/server";

// Ścieżki publiczne — bez weryfikacji
const PUBLIC = ["/login", "/api/auth", "/api/health", "/_next", "/favicon.ico"];

async function sessionToken() {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return null;
  const data = new TextEncoder().encode(password + ":inspirio-panel-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expected = await sessionToken();

  // Jeśli PANEL_PASSWORD nie jest ustawione, przepuść (dev bez konfiguracji)
  if (!expected) return NextResponse.next();

  const cookie = request.cookies.get("panel_auth")?.value;
  if (cookie !== expected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

