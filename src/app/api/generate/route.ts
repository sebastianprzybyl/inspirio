import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { platform, contentType, mood, niches } = await req.json()

    if (!platform || !contentType || !mood) {
      return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 })
    }

    const prompt = `Jesteś kreatywnym agentem do generowania pomysłów na content dla twórców internetowych.

Twórca podał następujące informacje:
- Platforma: ${platform}
- Typ contentu: ${contentType}
- Nastrój / styl: ${mood}
- Nisze / tematy twórcy: ${niches?.join(', ') || 'ogólne'}

Wygeneruj DOKŁADNIE 3 konkretne pomysły na content. Każdy pomysł powinien być gotowy do realizacji dzisiaj.

Odpowiedz TYLKO w formacie JSON, bez żadnego dodatkowego tekstu ani markdown:
{
  "ideas": [
    {
      "title": "Tytuł / główna koncepcja pomysłu (max 60 znaków)",
      "body": "Opis realizacji: hook, struktura, dlaczego zadziała (2-3 zdania)",
      "tags": ["tag1", "tag2", "tag3"],
      "hot": true
    },
    {
      "title": "...",
      "body": "...",
      "tags": ["...", "..."],
      "hot": false
    },
    {
      "title": "...",
      "body": "...",
      "tags": ["...", "..."],
      "hot": false
    }
  ]
}

Zasady:
- Pomysł #1 oznacz hot: true jeśli to aktualny trend, hot: false jeśli nie
- Tytuły muszą być konkretne i chwytliwe, nie ogólne
- Body powinno zawierać konkretny hook lub strukturę
- Tagi: 2-4 krótkie słowa kluczowe po polsku
- Dostosuj do platformy: ${platform} ma swój specyficzny styl
- Jeśli mood to "Zaskocz mnie" — bądź naprawdę kreatywny i nieoczekiwany`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Błąd generowania pomysłów' }, { status: 500 })
  }
}
