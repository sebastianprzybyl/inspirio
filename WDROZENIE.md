# Inspirio — Plan wdrożenia krok po kroku

> **Cel:** uruchomić cały pipeline: GitHub Actions generuje post → Supabase przechowuje → Vercel panel zatwierdza → Meta Graph API publikuje na Instagram.

---

## Stan implementacji

| Moduł | Status |
|---|---|
| `generator/` — generowanie treści (Gemini) | ✅ gotowy |
| `graphics/` — renderowanie grafik (Puppeteer) | ✅ gotowy |
| `publisher/` — publikacja na Instagram (Meta API) | ✅ gotowy |
| `app/` — panel Next.js (Vercel) | ✅ gotowy |
| `.github/workflows/generate.yml` — cron generator | ✅ gotowy |
| `.github/workflows/publish.yml` — cron publisher | ❌ do zrobienia |
| Supabase — projekt, tabela, bucket | ⚠️ wymaga konfiguracji |
| Vercel — deploy + env vars | ⚠️ wymaga konfiguracji |
| GitHub Secrets — klucze API | ⚠️ wymaga konfiguracji |

---

## Faza 1 — Supabase

### Krok 1.1 — Utwórz projekt Supabase
1. Wejdź na https://supabase.com → **New project**
2. Zapamiętaj: `Project URL` i oba klucze (`anon` i `service_role`)
3. **WAŻNE:** klucz `service_role` trafia do GitHub Secrets i Vercel — **nigdy** nie wklejaj go do frontendu/klienta

### Krok 1.2 — Utwórz tabelę i polityki RLS
1. Supabase Dashboard → **SQL Editor** → wklej i uruchom cały plik `supabase/schema.sql`
2. Sprawdź w **Table Editor** czy tabela `posts` istnieje z kolumnami: `id, status, type, topic, caption, tags, image_url, slides, error_message, published_post_id, created_at, updated_at, published_at`

### Krok 1.3 — Utwórz bucket Storage
1. Supabase Dashboard → **Storage** → **New bucket**
2. Nazwa: `ZZZZ342Q`
3. Public: **TAK** (grafiki muszą być publicznie dostępne dla Meta Graph API)

### ✅ Weryfikacja Faza 1
- [ ] Tabela `posts` widoczna w Table Editor
- [ ] Bucket `instagram-posts` widoczny w Storage
- [ ] Możesz ręcznie wstawić testowy rekord w SQL Editor: `INSERT INTO posts (status, type, topic, caption) VALUES ('pending', 'post', 'Test', 'Opis testowy');`
- [ ] Rekord pojawia się w tabeli

---

## Faza 2 — Środowisko lokalne

### Krok 2.1 — Utwórz `.env.local`
Skopiuj `.env.example` → `.env.local` i uzupełnij:
```
SUPABASE_URL=https://TWOJ-PROJEKT.supabase.co
SUPABASE_KEY=eyJ...  ← klucz service_role (długi, zaczyna się od eyJ)
INSTAGRAM_USER_ID=17841456863204750
INSTAGRAM_ACCESS_TOKEN=IGAAMfn...
GEMINI_API_KEY=AIza...
PUBLISH_DRY_RUN=true
```

### Krok 2.2 — Zainstaluj zależności
```bash
npm install
```

### Krok 2.3 — Test renderowania grafik (Puppeteer)
```bash
npm run render:smoke
```
**Oczekiwany wynik:** `{ "localPath": "C:\\...\\ig-UUID.png", "publicUrl": null }` i plik PNG o rozmiarze > 0.

### Krok 2.4 — Test generatora (dry-run, bez Supabase)
```bash
node generator/index.js --dry-run
```
**Oczekiwany wynik:** JSON z `topic`, `generated` (caption, tags, slides) i `saved: { dryRun: true }`.

### Krok 2.5 — Test generatora (z Supabase)
```bash
npm run generate
```
**Oczekiwany wynik:** rekord pojawia się w Supabase z `status: "pending"` i `image_url` z Supabase Storage.

### Krok 2.6 — Test połączenia z Instagram
```bash
npm run check:instagram
```
**Oczekiwany wynik:** wszystkie kroki z ✅, quota widoczna (np. `0/50`).

### Krok 2.7 — Test panelu lokalnie
```bash
npm run dev
```
Otwórz http://localhost:3000 — powinieneś widzieć kartę posta wygenerowanego w Krok 2.5.

### ✅ Weryfikacja Faza 2
- [ ] `npm run render:smoke` — tworzy plik PNG
- [ ] `npm run generate` — rekord w Supabase z `status: pending`
- [ ] `npm run check:instagram` — wszystkie ✅
- [ ] `npm run dev` — panel pokazuje post z Supabase
- [ ] Przycisk "Odrzuć" — status zmienia się na `rejected` w Supabase
- [ ] Przycisk "Zatwierdź i opublikuj" — przy `PUBLISH_DRY_RUN=true` status zmienia się na... (sprawdź czy `published` pojawia się w Supabase)

---

## Faza 3 — Wercel (panel webowy)

### Krok 3.1 — Wypchnij repo na GitHub
```bash
git add .
git commit -m "feat: initial Inspirio setup"
git push origin main
```

### Krok 3.2 — Połącz z Vercel
1. Wejdź na https://vercel.com → **New Project** → Import z GitHub
2. Wybierz repo `inspirio`
3. Framework: **Next.js** (auto-wykryty)
4. **Nie klikaj Deploy jeszcze** — najpierw dodaj env vars

### Krok 3.3 — Dodaj zmienne środowiskowe w Vercel
W Vercel: **Settings → Environment Variables**:
```
SUPABASE_URL         = https://TWOJ-PROJEKT.supabase.co
SUPABASE_KEY         = eyJ...service_role...  ← MUSI być service_role!
INSTAGRAM_USER_ID    = 17841456863204750
INSTAGRAM_ACCESS_TOKEN = IGAAMfn...
```
> ⚠️ `PUBLISH_DRY_RUN` **nie dodawaj** do Vercel — na produkcji chcemy prawdziwą publikację.

### Krok 3.4 — Deploy
Vercel → **Deploy**. Poczekaj na build (~2 min).

### ✅ Weryfikacja Faza 3
- [ ] Build zakończony bez błędów
- [ ] `https://TWOJ-URL.vercel.app/api/health` zwraca `{ "ok": true }`
- [ ] `https://TWOJ-URL.vercel.app` — panel wyświetla posty z Supabase
- [ ] Przycisk "Odrzuć" działa (zmiana statusu w Supabase)

---

## Faza 4 — GitHub Actions (generator)

### Krok 4.1 — Dodaj GitHub Secrets
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
```
GEMINI_API_KEY   ← klucz z Google AI Studio
SUPABASE_URL     ← URL projektu Supabase
SUPABASE_KEY     ← klucz service_role
```

### Krok 4.2 — Przetestuj workflow ręcznie
GitHub → **Actions → Generate Instagram Content → Run workflow**

Obserwuj logi — powinny pojawić się kroki: Install dependencies → Generate and save pending post.

### ✅ Weryfikacja Faza 4
- [ ] Workflow zakończony ✅ (zielony)
- [ ] Nowy rekord pojawia się w Supabase z `status: pending`
- [ ] Post widoczny w panelu Vercel
- [ ] Cron odpala się o 07:00 UTC (sprawdź następnego dnia)

---

## Faza 5 — Pełny test end-to-end publikacji

### Krok 5.1 — Test publikacji przez skrypt (bezpieczny dry-run)
```bash
node scripts/test-publish.js --dry-run
```
Tworzy media container na IG bez publikacji. Sprawdza czy token i konto działają.

### Krok 5.2 — Pierwszy prawdziwy post przez panel
1. Upewnij się że jest post z `status: pending` w Supabase
2. Otwórz panel na Vercel
3. Edytuj caption jeśli chcesz
4. Kliknij **Zatwierdź i opublikuj**
5. Sprawdź Instagram — post powinien pojawić się w ciągu 10–30 sekund

### ✅ Weryfikacja Faza 5
- [ ] Post opublikowany na Instagram ✅
- [ ] W Supabase rekord ma `status: published`, `published_post_id` i `published_at`
- [ ] W panelu karta znika po zatwierdzeniu

---

## Faza 6 — Automatyczny publisher (GitHub Actions) ❌ do zrobienia

Ten workflow automatycznie publikuje posty ze statusem `approved` — przydatny jeśli chcesz oddzielić "zatwierdzenie" od "publikacji" (np. zatwierdzasz rano, cron publikuje o 12:00).

### Krok 6.1 — Utwórz `.github/workflows/publish.yml`
```yaml
name: Publish Approved Posts

on:
  schedule:
    - cron: "0 10 * * *"  # codziennie o 10:00 UTC
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Publish approved posts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          INSTAGRAM_USER_ID: ${{ secrets.INSTAGRAM_USER_ID }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
        run: npm run publish
```

### Krok 6.2 — Dodaj brakujące GitHub Secrets
```
INSTAGRAM_USER_ID      ← ID konta IG Business
INSTAGRAM_ACCESS_TOKEN ← token Meta Graph API
```

### ✅ Weryfikacja Faza 6
- [ ] Wstaw testowy post z `status: approved` ręcznie w Supabase
- [ ] Odpal workflow ręcznie (workflow_dispatch)
- [ ] Post pojawia się na Instagram
- [ ] Status w Supabase zmienia się na `published`

---

## Faza 7 — Utrzymanie

### Token Instagram (co 50–60 dni)
Token Meta Graph API wygasa po 60 dniach. Odśwież go przed wygaśnięciem:
1. Wejdź na https://developers.facebook.com → Twoja aplikacja → Tools → Access Token Debugger
2. Wygeneruj nowy long-lived token
3. Zaktualizuj w Vercel: **Settings → Environment Variables → INSTAGRAM_ACCESS_TOKEN → Edit**
4. Zaktualizuj w GitHub Secrets: **Settings → Secrets → INSTAGRAM_ACCESS_TOKEN → Update**
5. Zaktualizuj lokalnie w `.env.local`

Zweryfikuj token:
```bash
npm run check:instagram
```

### Dodawanie nowych tematów
Edytuj `generator/topics.json` — dodaj nowe tematy do tablicy. Generator rotuje je cyklicznie według dnia roku.

### Monitoring
- GitHub Actions → zakładka **Actions** — widać historię wszystkich uruchomień
- Supabase → Table Editor — widać wszystkie posty i ich statusy
- Jeśli post ma `status: failed` — kolumna `error_message` zawiera przyczynę

---

## Kolejność wykonania (skrót)

```
[1] Supabase: projekt → schema.sql → bucket instagram-posts
[2] .env.local: uzupełnij wszystkie zmienne
[3] npm install && npm run render:smoke          ← test lokalny
[4] npm run generate                             ← test generatora
[5] npm run check:instagram                      ← test Meta API
[6] npm run dev → panel lokalnie                 ← test panelu
[7] git push → Vercel: deploy + env vars         ← panel na produkcji
[8] GitHub Secrets: GEMINI_API_KEY, SUPABASE_*   ← Actions
[9] Actions: Run workflow → weryfikacja          ← test cron
[10] Panel Vercel: zatwierdź i opublikuj         ← pierwszy realny post
[11] Utwórz publish.yml                          ← automatyczna publikacja
```

