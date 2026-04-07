# Graphics — Design System Inspirio

Moduł odpowiedzialny za renderowanie grafik 1080×1080 px na Instagram.
Używa Puppeteer (HTML → PNG) i Supabase Storage.

---

## Struktura plików

```
graphics/
├── assets/
│   ├── brand.css           ← GŁÓWNY plik styli: font + tokeny + reset
│   ├── colors.css          ← alias / backward-compat (importuje te same tokeny)
│   └── logo.svg            ← logo Inspirio (kolor: --accent #7F77DD)
├── templates/
│   ├── post.html           ← szablon okładki posta (1080×1080)
│   └── carousel-slide.html ← szablon slajdu karuzeli (1080×1080)
├── test/
│   └── render.smoke.test.js
└── render.js               ← API renderowania (eksportuje renderPostImage, renderCarouselSlideImage)
```

---

## Paleta kolorów

| Token CSS           | Hex        | Zastosowanie                          |
|---------------------|------------|---------------------------------------|
| `--bg`              | `#0E0E10`  | Tło strony / slajdu                   |
| `--surface`         | `#17171C`  | Tło elementów (bottombar, karty)      |
| `--divider`         | `#2A2A2E`  | Linie separatorów                     |
| `--text-main`       | `#FFFFFF`  | Tekst główny (nagłówki, treść)        |
| `--text-muted`      | `#888888`  | Tekst drugorzędny (podtytuły, body)   |
| `--accent`          | `#7F77DD`  | Akcent fioletowy (logo, bullet, CTA)  |
| `--accent-soft`     | `#EEEDFE`  | Jasne tło badge'y                     |
| `--accent-strong`   | `#3C3489`  | Ciemny fiolet (tekst na badge'ach)    |

---

## Typografia

**Krój:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Google Fonts)
**Fallback:** `Arial, Helvetica, sans-serif`

| Zastosowanie        | Rozmiar | Waga |
|---------------------|---------|------|
| Nagłówek (post)     | 88px    | 700  |
| Tytuł slajdu        | 72px    | 700  |
| Podtytuł            | 44px    | 500  |
| Body / body slajdu  | 36–40px | 400  |
| Badge / label       | 22–26px | 600  |
| Logo text           | 24–28px | 700  |
| Stopka / data       | 22–24px | 400  |

---

## Logo

Plik: `assets/logo.svg` — gwiazdka SVG, domyślnie w kolorze `--accent` (`#7F77DD`).

### Użycie w szablonach HTML

```html
<!-- Logo w kolorze akcentu (ciemne tło) -->
<img src="../assets/logo.svg" alt="Inspirio" />

<!-- Logo białe (na kolorowym tle) — CSS filter -->
<img src="../assets/logo.svg" alt="Inspirio" class="white" />
```

```css
.logo img.white {
  filter: brightness(0) invert(1);
}
```

---

## Szablony

### `post.html` — okładka posta

Układ pionowy: `topbar → content → divider → bottombar`

| Sekcja      | Zawartość                                    |
|-------------|----------------------------------------------|
| `topbar`    | Logo + nazwa marki | Badge z typem posta     |
| `content`   | Nagłówek + podtytuł + lista punktów (bullet) |
| `divider`   | Linia `--divider` (1px)                      |
| `bottombar` | Logo białe + CTA "link w bio" + data         |

**ID do wstrzykiwania treści przez Puppeteer:**

| ID              | Typ  | Opis                           |
|-----------------|------|--------------------------------|
| `postType`      | span | Tekst badge'a (np. "PORADA")   |
| `headline`      | h1   | Główny nagłówek posta          |
| `subheadline`   | p    | Podtytuł / kontekst            |
| `bodyPoints`    | ul   | Lista punktów (li przez JS)    |
| `date`          | span | Data w formacie `YYYY-MM-DD`   |

---

### `carousel-slide.html` — slajd karuzeli

Układ pionowy: `topbar → content → bottombar`

| Sekcja      | Zawartość                                          |
|-------------|----------------------------------------------------|
| `topbar`    | Logo (muted) | Numer slajdu (fioletowe kółko)      |
| `content`   | Tytuł + linia akcentu + tekst body                 |
| `bottombar` | Logo + marka | Kropka akcentu                      |

**ID do wstrzykiwania treści przez Puppeteer:**

| ID           | Typ  | Opis                             |
|--------------|------|----------------------------------|
| `slideIndex` | div  | Numer slajdu (1, 2, 3…)          |
| `slideTitle` | h1   | Tytuł slajdu                     |
| `slideBody`  | p    | Treść / opis slajdu              |

---

## Rejestr szablonów (`registry.js`)

Centralny kontrakt między danymi z AI a szablonami HTML.
Każdy szablon ma zdefiniowane pola z typami, limitami i opisami.

```js
import { TEMPLATE_REGISTRY, validateTemplateData, buildTemplateSchema } from "./registry.js";

// Walidacja danych przed renderem (rzuca błąd z listą naruszeń)
validateTemplateData("story-value", { valueTitle: "...", valuePoints: ["a", "b"] });

// Generuje schemat JSON do wklejenia w AI prompt
console.log(buildTemplateSchema("story-value"));
// → // Szablon: story-value — ...
//   {
//     "valueTitle": string  // wymagane, max 80 znaków — ...
//     "valuePoints": string[]  // wymagane, max 5 elementów — ...
//   }
```

### Dostępne szablony

| Klucz             | Format | Rozmiar    | Opis |
|-------------------|--------|------------|------|
| `post`            | feed   | 1080×1080  | Okładka posta — nagłówek + lista punktów |
| `carousel-slide`  | feed   | 1080×1080  | Slajd karuzeli — numer, tytuł, treść |
| `story-hook`      | story  | 1080×1920  | Story 1/3 — hook / pytanie otwierające |
| `story-value`     | story  | 1080×1920  | Story 2a/3 — tytuł + ponumerowana lista |
| `story-quote`     | story  | 1080×1920  | Story 2b/3 — sentencja / cytat z autorem |
| `story-cta`       | story  | 1080×1920  | Story 3/3 — CTA na fioletowym tle |

---

## Jak dodać nowy szablon

1. **Stwórz plik HTML** w `templates/` z odpowiednimi `id=` elementami.
   Używaj tokenów z `brand.css`, nie hardkoduj kolorów.

2. **Dodaj wpis do `registry.js`** z opisem pól:
   ```js
   "moj-szablon": {
     file:        "moj-szablon.html",
     size:        { width: 1080, height: 1920 },
     format:      "story",
     description: "Opis dla AI i developerów",
     fields: {
       pole1: { type: "string",   required: true,  maxLength: 100, description: "Opis pola" },
       pole2: { type: "string[]", required: false, maxItems: 5,    description: "Opis pola" },
     },
   },
   ```

3. **Dodaj evaluator do `EVALUATORS` w `render.js`**:
   ```js
   "moj-szablon": ({ pole1, pole2 }) => {
     document.getElementById("pole1").textContent = pole1 || "";
     // ...
   },
   ```

4. **Renderuj przez `renderByTemplate`**:
   ```js
   renderByTemplate("moj-szablon", { pole1: "wartość", pole2: ["a", "b"] }, { upload: true })
   ```

5. **Zaktualizuj tabelę szablonów** w tym README.

---

## Render API (`render.js`)

```js
import { renderPostImage, renderCarouselSlideImage } from "./graphics/render.js";

// Okładka posta
const { localPath, publicUrl } = await renderPostImage(
  { postType: "PORADA", headline, subheadline, bodyPoints: [...], date },
  { upload: true }   // false → tylko lokalny PNG, bez Supabase
);

// Slajd karuzeli
const { localPath, publicUrl } = await renderCarouselSlideImage(
  { index: 1, title, body },
  { upload: true }
);
```

> **Uwaga:** każde wywołanie uruchamia oddzielną instancję Puppeteer/Chromium.
> Przy generowaniu wielu slajdów naraz rozważ współbieżność przez `Promise.all`.

