-- =============================================================
-- Inspirio — przykładowe dane testowe
-- Uruchom po schema.sql w Supabase SQL Editor
-- =============================================================

-- Wyczyść istniejące dane testowe (opcjonalnie)
-- truncate table public.posts restart identity cascade;

-- -------------------------------------------------------------
-- 1. Posty oczekujące (pending) — widoczne w panelu
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000001',
  'pending',
  'post',
  'Jak utrzymac regularnosc publikacji na Instagramie',
  'Regularność to Twój największy atut na Instagramie. Nie chodzi o perfekcję — chodzi o obecność. Oto 3 zasady, które pomogą Ci publikować konsekwentnie, nawet gdy brakuje czasu i pomysłów.',
  ARRAY['#instagram', '#contentcreator', '#regularnosc', '#socialMedia', '#marketingtips'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-1.png',
  '[]'::jsonb
);

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000002',
  'pending',
  'post',
  '5 bledow w pierwszych 3 sekundach rolki',
  'Tracisz widzów w pierwszych 3 sekundach? To nie przypadek. Oto 5 błędów, które sprawiają, że ludzie scrollują dalej — i jak je naprawić jeszcze dziś.',
  ARRAY['#reels', '#instagramreels', '#videomarketing', '#błędytwórców', '#tipsandtricks'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-2.png',
  '[]'::jsonb
);

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000003',
  'pending',
  'post',
  'Jak napisac CTA, ktore zwieksza zapisania',
  'Zapisanie = czytelnik, który wraca. CTA to nie "zapisz jeśli się podobało" — to zaproszenie do wartości. Pokaż im dokładnie, co zyskują.',
  ARRAY['#cta', '#copywriting', '#instagramtips', '#growthstrategy', '#tworcyinternetowi'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-3.png',
  '[]'::jsonb
);

-- -------------------------------------------------------------
-- 2. Karuzela oczekująca (pending) — z wypełnionymi slajdami
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000004',
  'pending',
  'carousel',
  'Jak budowac serie edukacyjna na karuzeli',
  'Seria edukacyjna na karuzeli to jeden z najlepszych formatów na budowanie zasięgów organicznych. Przesuń →, żeby zobaczyć cały schemat.',
  ARRAY['#karuzela', '#edukacja', '#instagram', '#contentmarketing', '#serieedukacyjna'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-carousel-cover.png',
  '[
    {"index": 1, "title": "Czym jest seria edukacyjna?",       "body": "To sekwencja postów, które uczą jednego tematu krok po kroku.",                        "image_url": "https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-carousel-slide-1.png"},
    {"index": 2, "title": "Krok 1 — Wybierz jeden problem",   "body": "Zdefiniuj jeden konkretny problem, który Twoja seria ma rozwiązać.",                   "image_url": "https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-carousel-slide-2.png"},
    {"index": 3, "title": "Krok 2 — Zaplanuj 4–6 odcinków",  "body": "Każdy post to jeden krok rozwiązania. Nie zagęszczaj — jeden slajd, jedna myśl.",     "image_url": "https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-carousel-slide-3.png"},
    {"index": 4, "title": "Krok 3 — Dodaj CTA na końcu",     "body": "Ostatni slajd: zapisz serię, żeby nie przegapić kolejnego odcinka.",                   "image_url": "https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-carousel-slide-4.png"}
  ]'::jsonb
);

-- -------------------------------------------------------------
-- 3. Post zatwierdzony (approved)
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000005',
  'approved',
  'post',
  'Jak planowac tydzien tresci w 30 minut',
  'Planowanie tygodnia treści nie musi zajmować godzin. Oto mój system na 30 minut w niedzielę wieczór, który zapewnia spokój przez cały tydzień.',
  ARRAY['#planowanie', '#contentplan', '#produktywnosc', '#instagram', '#tworca'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-5.png',
  '[]'::jsonb
);

-- -------------------------------------------------------------
-- 4. Post odrzucony (rejected)
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides)
values (
  'a1000000-0000-0000-0000-000000000006',
  'rejected',
  'post',
  'Jak mierzyc skutecznosc postow bez platnych narzedzi',
  'Skuteczność mierzysz zanim zapłacisz za jakiekolwiek narzędzie. Instagram Insights + prosta tabela w Notion wystarczą na start.',
  ARRAY['#analytics', '#instagraminsights', '#darmowenarzedzia', '#mierzenie', '#tworca'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-6.png',
  '[]'::jsonb
);

-- -------------------------------------------------------------
-- 5. Post opublikowany (published)
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides, published_post_id, published_at)
values (
  'a1000000-0000-0000-0000-000000000007',
  'published',
  'post',
  'Jak recyklingowac jeden temat na 3 formaty',
  'Jeden temat = trzy posty. Karuzela edukacyjna → cytat na grafice → rolka z podsumowaniem. To nie lenistwo — to strategia.',
  ARRAY['#recykling', '#contentstrategy', '#instagram', '#3formaty', '#efektywnosc'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-7.png',
  '[]'::jsonb,
  '17841456863204750_999000001',
  now() - interval '2 days'
);

-- -------------------------------------------------------------
-- 6. Post zakończony błędem (failed)
-- -------------------------------------------------------------

insert into public.posts (id, status, type, topic, caption, tags, image_url, slides, error_message)
values (
  'a1000000-0000-0000-0000-000000000008',
  'failed',
  'post',
  'Jak utrzymac regularnosc publikacji na Instagramie',
  'Regularność na Instagramie zaczyna się od systemu, nie od motywacji.',
  ARRAY['#instagram', '#regularnosc'],
  'https://lkmuiatcmokiiofgdoxr.supabase.co/storage/v1/object/public/instagram-posts/test-post-8.png',
  '[]'::jsonb,
  'Meta API error 190: Invalid OAuth access token — token wygasł lub jest nieprawidłowy.'
);

