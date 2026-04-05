# Inspirio — Instrukcje dla GitHub Copilot

Projekt: **automatyzacja tworzenia i publikowania treści na Instagramie**.
Język kodu: **JavaScript (ESM)**. Język UI i komentarzy: **polski**.

---

## Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Generowanie treści | Gemini API (`gemini-2.0-flash`) via `@google/genai` |
| Renderowanie grafik | Puppeteer (HTML → PNG 1080×1080) |
| Baza danych | Supabase (PostgreSQL) — tabela `posts` |
| Storage obrazków | Supabase Storage — bucket `instagram-posts` |
| Panel webowy | Next.js 15 (App Router, React 19) na Vercel |
| Publikacja | Meta Graph API v21.0 (Instagram Business) |
| Automatyzacja | GitHub Actions (cron daily 07:00 UTC) |
| Node.js | >=20, moduły ESM (`"type": "module"`) |

---

## Architektura — mapa modułów

```
GitHub Actions (cron)
  └─► generator/index.js        ← runGenerator()
        ├─► generator/prompts.js      ← buildContentPrompt(), parseClaudeJson(), normalizeGeneratedPayload()
        ├─► graphics/render.js        ← renderPostImage(), renderCarouselSlideImage()
        │     └─► Puppeteer → PNG → Supabase Storage
        └─► Supabase posts (status: "pending")

Next.js Panel (Vercel)
  ├─► app/page.jsx              ← UI React: lista kart postów
  ├─► app/api/posts/route.js    ← GET ?status=pending | PATCH {id, status, caption?}
  └─► app/api/publish/route.js  ← POST {id, type, caption, tags, image_url, slides}
        ├─► publisher/instagram.js → publishPost()  ← CZYSTA funkcja, bez Supabase
        └─► Supabase posts (status: "published" lub "failed")

publisher/instagram.js (także standalone CLI)
  └─► runPublisher()            ← używany przez GitHub Actions publish workflow (jeśli istnieje)
        └─► Supabase posts (status: "approved") → Meta Graph API → status: "published"
```

---

## Lifecycle statusu posta w Supabase

```
pending → (panel: Zatwierdź i opublikuj) → published
pending → (panel: Odrzuć)               → rejected
pending/approved → (publisher CLI)      → published | failed
```

Dopuszczalne wartości `status` (constraint w DB):
`pending` | `approved` | `rejected` | `published` | `failed`

---

## Kluczowe pliki i ich odpowiedzialności

### `generator/index.js`
- **Eksport:** `runGenerator({ dryRun? })` — główna funkcja generowania
- **Eksport:** `getTopicForToday(date?)` — wybór tematu z `topics.json` (rotacja cykliczna)
- Wywołuje Gemini API → `prompts.js` → `graphics/render.js` → Supabase INSERT
- Używany przez GitHub Actions (`npm run generate`) i CLI bezpośrednio

### `generator/prompts.js`
- **Eksport:** `buildContentPrompt({ topic, dateIso })` — zwraca string prompt dla Gemini
- **Eksport:** `parseClaudeJson(rawText)` — parsuje JSON z odpowiedzi AI (obsługuje code blocki)
- **Eksport:** `normalizeGeneratedPayload(payload)` — waliduje i normalizuje odpowiedź AI
- Czyste funkcje, żadnych zewnętrznych zależności → łatwe do unit testowania

### `graphics/render.js`
- **Eksport:** `renderPostImage(content, options)` — renderuje post 1080×1080
- **Eksport:** `renderCarouselSlideImage(slide, options)` — renderuje jeden slajd karuzeli
- `options.upload = true` → uploaduje do Supabase Storage i zwraca `publicUrl`
- `options.upload = false` → zwraca tylko `localPath` (do testów lokalnych)
- **Uwaga:** każde wywołanie `renderTemplate` uruchamia nową instancję Puppeteer

### `publisher/instagram.js`
- **Eksport:** `publishPost(post)` — czysta funkcja, publikuje na IG, **nie dotyka Supabase**
- **Eksport:** `buildCaption(caption, tags)` — łączy caption + hashtagi, limit 2200 znaków
- **Eksport:** `runPublisher({ dryRun? })` — pełny flow z Supabase (dla GitHub Actions)
- **Eksport:** `testMetaConnection()` — sprawdza token i quota Meta API
- Wewnętrzne: `publishSinglePost()`, `publishCarousel()`, `createMediaContainer()`, `publishContainer()`

### `app/api/posts/route.js`
- `GET /api/posts?status=pending` — zwraca posty wg statusu (limit 50)
- `PATCH /api/posts` body: `{ id, status, caption? }` — aktualizuje status/caption

### `app/api/publish/route.js`
- `POST /api/publish` body: `{ id, type, caption, tags, image_url, slides }`
- Wywołuje `publishPost()` z `publisher/instagram.js`
- Po sukcesie: aktualizuje Supabase → `status: "published"`, `published_post_id`, `published_at`
- Po błędzie: aktualizuje Supabase → `status: "failed"`, `error_message`
- **Uwaga architektoniczna:** klient wysyła pełne dane posta — rozważyć pobieranie po `id` z Supabase

### `app/page.jsx`
- React Client Component (`"use client"`)
- Optimistic UI: karta znika przed potwierdzeniem z serwera, wraca przy błędzie
- `approve(post)` → `POST /api/publish`
- `reject(post)` → `PATCH /api/posts` z `status: "rejected"`

### `supabase/schema.sql`
- Tabela `posts` z RLS (Row Level Security)
- Polityka `anon` może: SELECT `pending`, UPDATE `pending → approved/rejected/pending`
- Polityka `service_role` może: wszystko
- **WAŻNE:** zapis `status: "published"` lub `"failed"` wymaga klucza `service_role`, nie `anon`!
  Zmienna `SUPABASE_KEY` w Next.js musi być kluczem `service_role`.

---

## Schemat tabeli `posts`

```sql
id               uuid (PK)
status           text  -- pending | approved | rejected | published | failed
type             text  -- post | carousel
topic            text
caption          text
tags             text[]
image_url        text  -- URL z Supabase Storage (cover posta)
slides           jsonb -- [{ index, title, body, image_url, local_path }]
error_message    text
published_post_id text
created_at       timestamptz
updated_at       timestamptz  -- auto-update via trigger
published_at     timestamptz
```

---

## Zmienne środowiskowe

### GitHub Secrets (Actions)
```
GEMINI_API_KEY          ← Gemini API (generator)
SUPABASE_URL            ← URL projektu Supabase
SUPABASE_KEY            ← klucz service_role (nie anon!)
```

### Vercel (Next.js panel)
```
SUPABASE_URL
SUPABASE_KEY            ← klucz service_role (wymagany do zapisu published/failed)
INSTAGRAM_USER_ID       ← ID konta IG Business
INSTAGRAM_ACCESS_TOKEN  ← token Meta Graph API (ważny 60 dni)
```

### Lokalne (`.env.local`)
```
SUPABASE_URL
SUPABASE_KEY
INSTAGRAM_USER_ID
INSTAGRAM_ACCESS_TOKEN
PUBLISH_DRY_RUN=true    ← pomiń wywołanie Instagram API lokalnie
GEMINI_API_KEY          ← opcjonalnie; bez niego generator używa mockowych danych
```

---

## Komendy

```bash
npm run dev              # Next.js panel lokalnie
npm run generate         # Uruchom generator (wymaga zmiennych env)
npm run publish          # Uruchom publisher CLI
npm run render:smoke     # Test renderowania grafik (Puppeteer)
npm run check:instagram  # Sprawdź połączenie z Meta Graph API
npm run test             # Uruchom wszystkie testy (node:test)
```

---

## Testy

| Plik | Typ | Co testuje |
|---|---|---|
| `generator/test/generate.integration.test.js` | unit | `parseClaudeJson`, `normalizeGeneratedPayload` |
| `publisher/test/publish.dryrun.test.js` | unit | `buildCaption` |
| `graphics/test/render.smoke.test.js` | smoke | Puppeteer → PNG (bez uploadu) |

Testy używają wbudowanego `node:test` i `node:assert/strict`. Żadnych zewnętrznych frameworków testowych.

---

## GitHub Actions

### `.github/workflows/generate.yml`
- Trigger: `cron: "0 7 * * *"` (codziennie 07:00 UTC) + `workflow_dispatch`
- Uruchamia: `npm run generate`
- Zużycie: ~3–5 min/dzień ≈ 150 min/mies. (limit free: 2000 min/mies.)

### Planowany `.github/workflows/publish.yml` (jeszcze nie istnieje)
- Trigger: co godzinę, sprawdza posty `status = "approved"`
- Uruchamia: `npm run publish`

---

## Znane ograniczenia i uwagi

1. **Puppeteer na Vercel** — `graphics/render.js` używa Puppeteer. Nie działa w standardowych serverless functions Vercel bez `@sparticuz/chromium`. Generator musi być uruchamiany przez GitHub Actions, nie przez Next.js API.

2. **Klucz service_role** — `SUPABASE_KEY` w Next.js **musi** być kluczem `service_role`, ponieważ polityki RLS pozwalają kluczowi `anon` na zapis tylko do statusów `approved/rejected/pending`. Zapis `published` i `failed` wymaga uprawnień service_role.

3. **Dane posta z klienta** — `app/api/publish/route.js` obecnie przyjmuje pełne dane posta od klienta zamiast pobierać je po `id` z Supabase. To potencjalne miejsce do poprawy bezpieczeństwa.

4. **Duplikacja `getSupabaseClient()`** — ta sama funkcja jest zdefiniowana w 4 plikach: `generator/index.js`, `graphics/render.js`, `publisher/instagram.js`, `app/api/posts/route.js`. Kandydat do wydzielenia do `lib/supabase.js`.

5. **Token Instagram** — ważny 60 dni. Wymaga ręcznego odnawiania (lub automatyzacji przez długoterminowy token Facebook).

---

## Struktura repo

```
inspirio/
├── .github/
│   └── workflows/
│       └── generate.yml
├── app/                        ← Next.js (panel webowy)
│   ├── page.jsx                ← UI React
│   ├── layout.jsx
│   ├── globals.css
│   ├── page.module.css
│   └── api/
│       ├── health/route.js
│       ├── posts/route.js
│       └── publish/route.js
├── generator/                  ← Logika generowania treści AI
│   ├── index.js
│   ├── prompts.js
│   ├── topics.json
│   └── test/
├── graphics/                   ← Renderowanie grafik (Puppeteer)
│   ├── render.js
│   ├── templates/
│   │   ├── post.html
│   │   └── carousel-slide.html
│   ├── assets/colors.css
│   └── test/
├── publisher/                  ← Publikacja na Instagram (Meta Graph API)
│   ├── instagram.js
│   └── test/
├── scripts/                    ← Narzędzia pomocnicze / diagnostyczne
│   ├── check-instagram.js
│   └── test-publish.js
├── supabase/
│   └── schema.sql
├── package.json
├── next.config.mjs             ← serverExternalPackages: ["puppeteer"]
└── jsconfig.json
```

