# Plan implementacji — Instagram Automation (jedno repo, darmowa infrastruktura)

## Stack technologiczny
- **Repo:** jeden monorepo na GitHubie
- **Automatyzacja:** GitHub Actions (cron, darmowy)
- **Baza danych + storage:** Supabase (darmowy tier)
- **Panel webowy:** Next.js lub zwykły HTML/JS hostowany na Vercel (darmowy)
- **Generowanie treści:** Claude API
- **Grafiki:** HTML szablony → PNG przez Puppeteer (Node.js)
- **Publikacja:** Meta Graph API (wymaga konta Instagram Business)

---

## Struktura repo

```
instagram-automation/
│
├── .github/
│   └── workflows/
│       ├── generate.yml        # Krok 1 — cron codziennie o 7:00
│       └── publish.yml         # Krok 5 — publikacja po zatwierdzeniu
│
├── generator/
│   ├── index.js                # Krok 1 — główny skrypt generujący
│   ├── prompts.js              # Szablony promptów do Claude API
│   └── topics.json             # Lista tematów tygodniowych (edytujesz ręcznie)
│
├── graphics/
│   ├── templates/
│   │   ├── post.html           # Szablon grafiki dla posta ← TUTAJ WKLEJASZ SWÓJ STYL
│   │   └── carousel-slide.html # Szablon slajdu karuzeli ← TUTAJ WKLEJASZ SWÓJ STYL
│   ├── assets/
│   │   ├── colors.css          # Twoja paleta kolorów ← TUTAJ WKLEJASZ KOLORY
│   │   └── logo.png            # Twoje logo lub inne zasoby
│   └── render.js               # Puppeteer: HTML → PNG
│
├── panel/
│   ├── index.html              # Panel zatwierdzania (gotowy z naszej rozmowy)
│   └── api.js                  # Połączenie z Supabase
│
├── publisher/
│   └── instagram.js            # Krok 5 — wysyłka przez Meta Graph API
│
├── .env.example                # Zmienne środowiskowe (bez sekretów)
└── README.md
```

---

## Krok 1 — Generator treści (GitHub Actions + Claude API)

**Co robi:** Codziennie o 7:00 odpala skrypt, który pyta Claude o treść posta i karuzeli na podstawie tematu z `topics.json`. Wynik zapisuje do Supabase ze statusem `pending`.

**Plik:** `.github/workflows/generate.yml`
```yaml
on:
  schedule:
    - cron: '0 7 * * *'   # codziennie o 7:00 UTC
  workflow_dispatch:        # możliwość ręcznego odpalenia
```

**Plik:** `generator/index.js`
```javascript
// 1. Pobierz temat dnia z topics.json
// 2. Wywołaj Claude API z promptem z prompts.js
// 3. Odbierz JSON z treścią posta i strukturą karuzeli
// 4. Przekaż do render.js → dostań URL obrazka z Supabase Storage
// 5. Zapisz rekord do tabeli `posts` w Supabase ze statusem 'pending'
```

**Prompt do Claude API** (plik `generator/prompts.js`) powinien zwracać JSON:
```json
{
  "caption": "Treść opisu posta...",
  "tags": ["#instagram", "#marketing"],
  "slides": [
    { "title": "Nagłówek slajdu", "body": "Treść slajdu" }
  ]
}
```

**Zmienne środowiskowe (GitHub Secrets):**
```
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_KEY
```

---

## Krok 2 — Generowanie grafik (Puppeteer + Supabase Storage)

**Co robi:** Skrypt `render.js` otwiera szablon HTML, wstrzykuje treść z Claude, robi screenshot PNG, uploaduje do Supabase Storage i zwraca publiczny URL.

**Plik:** `graphics/render.js`
```javascript
// 1. Otwórz graphics/templates/post.html przez Puppeteer
// 2. Wstrzyknij dane (tytuł, treść, tagi) przez page.evaluate()
// 3. page.screenshot({ path: 'post.png', clip: { width: 1080, height: 1080 } })
// 4. Upload PNG do Supabase Storage → bucket 'instagram-posts'
// 5. Zwróć publicUrl
```

**Plik:** `graphics/templates/post.html` ← **TUTAJ WKLEJASZ SWÓJ STYL**

To zwykły plik HTML z CSS. Puppeteer wyrenderuje go 1:1 jako obraz 1080×1080px.
Wstaw swoje kolory w `graphics/assets/colors.css` i zlinkuj w szablonie.
Możesz też dołączyć przykładowe PNG jako tło lub element graficzny.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../assets/colors.css">
  <style>
    body { width: 1080px; height: 1080px; /* Twój layout */ }
  </style>
</head>
<body>
  <div id="title"><!-- wypełniane przez render.js --></div>
  <div id="body"><!-- wypełniane przez render.js --></div>
</body>
</html>
```

**Schemat tabeli Supabase:**
```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  status text default 'pending',      -- pending | approved | rejected
  type text,                          -- post | carousel
  caption text,
  tags text[],
  image_url text,                     -- URL z Supabase Storage
  slides jsonb,                       -- dane karuzeli
  created_at timestamptz default now()
);
```

---

## Krok 3 — Panel zatwierdzania (HTML/JS na Vercel)

**Co robi:** Prosta strona webowa (gotowa z naszej rozmowy) — wyświetla posty ze statusem `pending`, pokazuje podgląd grafiki, pozwala zatwierdzić / odrzucić / edytować opis.

**Plik:** `panel/index.html` — wklej panel z naszej rozmowy.

**Plik:** `panel/api.js`
```javascript
const SUPABASE_URL = 'https://TWOJ-PROJEKT.supabase.co';
const SUPABASE_KEY = 'TWOJ_KLUCZ';

async function loadPosts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?status=eq.pending&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

async function updateStatus(id, status, caption = null) {
  const body = { status };
  if (caption) body.caption = caption;
  await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
```

**Deploy:** Wrzuć folder `panel/` na Vercel — jeden klik, darmowe, dostępne pod Twoim URL.

---

## Krok 4 — Publikacja (Meta Graph API)

**Co robi:** GitHub Actions sprawdza co godzinę czy są posty ze statusem `approved` i publikuje je przez Meta Graph API.

**Wymagania wstępne (zrób raz):**
1. Konto Instagram Business lub Creator
2. Aplikacja w Meta Developers → `developers.facebook.com`
3. Uprawnienia: `instagram_basic`, `instagram_content_publish`
4. Długoterminowy token dostępu (ważny 60 dni, do odnowienia)

**Plik:** `publisher/instagram.js`
```javascript
// Dla posta ze zdjęciem:
// 1. POST /v18.0/{ig-user-id}/media
//    { image_url, caption } → dostaniesz creation_id
// 2. POST /v18.0/{ig-user-id}/media_publish
//    { creation_id } → post opublikowany

// Dla karuzeli:
// 1. POST media dla każdego slajdu osobno → lista creation_id
// 2. POST /v18.0/{ig-user-id}/media z { media_type: 'CAROUSEL', children: [...ids] }
// 3. POST media_publish z finalnym creation_id
```

**Plik:** `.github/workflows/publish.yml`
```yaml
on:
  schedule:
    - cron: '0 * * * *'   # co godzinę sprawdza approved posty
  workflow_dispatch:
```

**Zmienne środowiskowe (GitHub Secrets):**
```
INSTAGRAM_USER_ID
INSTAGRAM_ACCESS_TOKEN
SUPABASE_URL
SUPABASE_KEY
```

---

## Zmienne środowiskowe — kompletna lista

Plik `.env.example` w repo (bez wartości, tylko nazwy):
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
```

W GitHub: Settings → Secrets and variables → Actions → dodaj każdą z powyższych.

---

## Kolejność implementacji

1. Załóż Supabase → utwórz tabelę `posts` + bucket `instagram-posts`
2. Zrób szablon HTML grafiki (`graphics/templates/post.html`) ze swoim stylem i kolorami
3. Napisz i przetestuj `render.js` lokalnie (Puppeteer)
4. Napisz i przetestuj `generator/index.js` lokalnie (Claude API → Supabase)
5. Wrzuć `panel/` na Vercel, sprawdź czy widać posty z Supabase
6. Skonfiguruj Meta Graph API, przetestuj `publisher/instagram.js` lokalnie
7. Dodaj oba GitHub Actions workflows i przetestuj `workflow_dispatch`

---

## Gdzie wklejasz swoje przykłady graficzne

| Co chcesz dodać | Gdzie to ląduje |
|---|---|
| Kolory, fonty, styl | `graphics/assets/colors.css` |
| Przykładowe PNG z inspiracją | `graphics/assets/` (referencja podczas kodowania szablonu) |
| Szablon posta (1080×1080) | `graphics/templates/post.html` |
| Szablon slajdu karuzeli | `graphics/templates/carousel-slide.html` |
| Logo / ikony | `graphics/assets/` |

Szablony HTML możesz tworzyć i podglądać w przeglądarce — nie potrzebujesz do tego żadnego buildu ani serwera.
