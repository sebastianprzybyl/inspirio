import { createClient } from "@supabase/supabase-js";

/**
 * Zwraca klienta Supabase (service_role).
 * Rzuca błąd jeśli brak zmiennych środowiskowych.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Brak zmiennych środowiskowych: SUPABASE_URL i/lub SUPABASE_KEY.");
  }
  return createClient(url, key);
}

/**
 * Zwraca klienta Supabase lub null jeśli brak zmiennych (soft fail).
 * Używaj gdy Supabase jest opcjonalne — np. w route handlerach gdzie
 * publikacja może się odbyć bez zapisu statusu.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient | null}
 */
export function getSupabaseClientOrNull() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

