# Publisher — integracja z Instagram Graph API

Moduł odpowiedzialny za publikację zatwierdzonych postów na Instagramie
przez **Instagram Graph API** (`graph.instagram.com`).

---

## Wymagane zmienne środowiskowe (`.env`)

```dotenv
INSTAGRAM_USER_ID=26881672958106177        # ID konta IG (odczytaj z kroku niżej)
INSTAGRAM_ACCESS_TOKEN=IGAAMfn...          # Long-lived token (ważny ~60 dni)
PUBLISH_DRY_RUN=true                       # true = nigdy nie publikuj naprawdę
```

> **Uwaga:** token jest publiczny w `.env.example` — wstaw swój tylko do `.env`
> (plik jest w `.gitignore` i nie trafi do repo).

---

## Jak uzyskać token i ID konta

### 1. Wygeneruj token w Graph API Explorer

Otwórz: <https://developers.facebook.com/tools/explorer>

1. Wybierz swoją **Meta App** (prawy górny róg)
2. Kliknij **Generate Access Token**
3. Zaznacz uprawnienia:
   - `instagram_basic`
   - `instagram_content_publish`
4. Zatwierdź logowaniem przez Facebook

### 2. Zamień na long-lived token (60 dni)

```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={APP_SECRET}
  &access_token={TOKEN_Z_KROKU_1}
```

`APP_SECRET` znajdziesz w: Meta Developers → Twoja App → **Settings → Basic**.

### 3. Odczytaj INSTAGRAM_USER_ID

```
GET https://graph.instagram.com/v21.0/me?fields=id,username
Authorization: Bearer {TOKEN}
```

Zwrócone `id` wstaw jako `INSTAGRAM_USER_ID` w `.env`.

---

## Komendy do testowania

### ✅ Pełna diagnostyka połączenia (tylko GET, nic nie publikuje)

```powershell
npm run check:instagram
```

Sprawdza:
- czy token jest ważny
- dane konta (@username, liczba followersów, postów)
- czy uprawnienie `instagram_content_publish` jest aktywne
- ile zostało z dziennego limitu publikacji (max 100)

---

### ✅ Dry-run publishera (bez Supabase, bez publikacji)

```powershell
npm run publish
```

> Wymaga `PUBLISH_DRY_RUN=true` w `.env`.  
> Robi **realny GET** do Meta API (weryfikuje token i quota),  
> ale **nie tworzy żadnych zasobów** — pokazuje co by zostało opublikowane.

---

### ✅ Dry-run z realnymi postami z Supabase (bez publikacji)

```powershell
npm run publish
```

> Gdy `PUBLISH_DRY_RUN=true` oraz `SUPABASE_URL` i `SUPABASE_KEY` są ustawione —  
> pobiera posty ze statusem `approved` z bazy i pokazuje co by poszło na IG,  
> ale **nie wywołuje żadnego POST** na Meta API.

---

### 🧪 Test publikacji — dry-run (tworzy container, NIE publikuje)

```powershell
npm run test:publish:dry
```

Tworzy prawdziwy **media container** na IG (weryfikuje cały przepływ API),
ale **nie wywołuje `media_publish`** — container wygasa automatycznie po 24h.
Użyj tego jako pierwszy krok przed publikacją.

---

### 🚨 Test publikacji — realny post na IG (jednorazowy!)

```powershell
npm run test:publish
```

Publikuje **prawdziwy post testowy** na Twoim koncie bez potrzeby Supabase.
Użyj tylko raz żeby potwierdzić że cały moduł działa end-to-end.

> Obrazek i caption możesz zmienić w `scripts/test-publish.js` (zmienne `TEST_IMAGE_URL` i `TEST_CAPTION`).

---

### 🚀 Realna publikacja (po ustawieniu wszystkiego)

```powershell
# Upewnij się że PUBLISH_DRY_RUN=false w .env, potem:
npm run publish
```

---

### 🔍 Debug tokenu (surowa odpowiedź Meta API)

```powershell
node scripts/debug-token.js
```

Pokazuje pełny JSON odpowiedzi z `graph.instagram.com/v21.0/me`  
— przydatne gdy `check:instagram` zgłasza błąd.

---

## Odświeżanie tokenu (co ~50 dni)

Long-lived token wygasa po **60 dniach**. Przed wygaśnięciem odśwież go:

```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={AKTUALNY_TOKEN}
```

Wstaw nowy token do `.env` i do GitHub Secrets (`INSTAGRAM_ACCESS_TOKEN`).

---

## Przepływ publikacji

```
Supabase (status: approved)
        │
        ▼
publisher/instagram.js
        │
        ├── post      → POST /{ig-user-id}/media        (tworzy container)
        │             → POST /{ig-user-id}/media_publish (publikuje)
        │
        └── carousel  → POST /{ig-user-id}/media (x N slajdów, is_carousel_item)
                      → POST /{ig-user-id}/media (CAROUSEL, children=[...])
                      → POST /{ig-user-id}/media_publish
        │
        ▼
Supabase (status: published / failed)
```

---

## Statusy postów w Supabase

| Status      | Znaczenie                                   |
|-------------|---------------------------------------------|
| `pending`   | Wygenerowany, czeka na akceptację w panelu  |
| `approved`  | Zatwierdzony — publisher go opublikuje      |
| `rejected`  | Odrzucony w panelu — nie będzie publikowany |
| `published` | Opublikowany na IG (`published_post_id` wypełniony) |
| `failed`    | Błąd publikacji (`error_message` wypełniony) |

---

## Limity Meta API

| Limit                     | Wartość  |
|---------------------------|----------|
| Posty dziennie            | 100      |
| Slajdy w karuzeli         | 2–10     |
| Czas ważności tokenu      | 60 dni   |
| Czas życia media container| 24h      |


