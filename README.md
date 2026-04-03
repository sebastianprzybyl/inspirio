# Instagram Automation

Automatyzacja tworzenia, akceptacji i publikacji postow IG:

- Generowanie treści: Gemini API (Google)
- Render grafik: HTML/CSS + Puppeteer
- Dane i storage: Supabase
- Panel akceptacji: statyczny HTML/JS
- Publikacja: Meta Graph API
- Orkiestracja: GitHub Actions

## 1) Instalacja

```bash
npm install
```

## 2) Konfiguracja `.env`

Skopiuj `.env.example` do `.env` i uzupelnij wartosci.

## 3) Supabase

1. W SQL Editor uruchom `supabase/schema.sql`.
2. Utworz bucket `instagram-posts` i ustaw go jako publiczny.

## 4) Lokalny smoke test renderera

```bash
npm run render:smoke
```

## 5) Lokalny test generatora (bez zapisu)

```bash
node generator/index.js --dry-run
```

## 6) Lokalny test publikatora (bez publikacji)

```bash
$env:PUBLISH_DRY_RUN='true'; npm run publish
```

## 7) Testy

```bash
npm test
```

## 8) GitHub Actions

Dodaj sekrety z `.env.example` w repo GitHub (Settings -> Secrets and variables -> Actions).
Workflowy:

- `.github/workflows/generate.yml`
- `.github/workflows/publish.yml`

