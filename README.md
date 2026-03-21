# Inspirio 🌟

AI agent do generowania pomysłów na content dla twórców internetowych.

## Stack
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Claude API (Anthropic)
- **Hosting**: Vercel (darmowy)

---

## Setup — krok po kroku

### 1. Klucz API Anthropic
1. Wejdź na https://console.anthropic.com
2. Zarejestruj się (darmowe konto)
3. Wejdź w **API Keys** → **Create Key**
4. Skopiuj klucz (zaczyna się od `sk-ant-...`)

### 2. Uruchomienie lokalne

```bash
# Zainstaluj zależności
npm install

# Skopiuj plik env
cp .env.example .env.local

# Wklej swój klucz API do .env.local:
# ANTHROPIC_API_KEY=sk-ant-TWOJ_KLUCZ

# Uruchom
npm run dev
```

Otwórz http://localhost:3000

### 3. Deploy na Vercel (darmowy)

1. Wrzuć projekt na GitHub:
```bash
git init
git add .
git commit -m "first commit"
# Stwórz repo na github.com i dodaj remote
git remote add origin https://github.com/TWOJ_USER/inspirio.git
git push -u origin main
```

2. Wejdź na https://vercel.com → **Add New Project**
3. Importuj repo z GitHub
4. W **Environment Variables** dodaj:
   - `ANTHROPIC_API_KEY` = twój klucz
5. Kliknij **Deploy** — gotowe!

---

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx              # Home
│   ├── onboarding/page.tsx   # Onboarding
│   ├── generate/page.tsx     # Workflow chat
│   ├── history/page.tsx      # Historia pomysłów
│   ├── api/generate/route.ts # Backend — Claude API
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── BottomNav.tsx
└── lib/
    ├── types.ts
    └── storage.ts            # localStorage helpers
```

---

## Koszty API

Claude Sonnet to ok. **$0.003 per generowanie** (3 pomysły).
Przy 100 generowaniach dziennie = ~$0.30/dzień.
