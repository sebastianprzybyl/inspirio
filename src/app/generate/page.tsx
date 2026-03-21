'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, addToHistory, generateId } from '@/lib/storage'
import type { Platform, ContentType, Mood, ContentIdea, WorkflowState } from '@/lib/types'

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'YouTube', 'Twitch', 'X / Twitter']
const CONTENT_TYPES: { type: ContentType; icon: string; sub: string }[] = [
  { type: 'Reels', icon: '🎬', sub: '15–90 sek' },
  { type: 'Karuzela', icon: '🖼', sub: 'lista, poradnik' },
  { type: 'Stories', icon: '💬', sub: 'interakcja' },
  { type: 'Post', icon: '📝', sub: 'storytelling' },
]
const MOODS: Mood[] = ['Trend teraz', 'Evergreen', 'Zaskocz mnie']

type Step = 'platform' | 'contentType' | 'mood' | 'generating' | 'result'

interface Message {
  role: 'agent' | 'user'
  text?: string
  chips?: string[]
  tiles?: { label: string; icon: string; sub: string }[]
  ideas?: ContentIdea[]
}

function GenerateInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [step, setStep] = useState<Step>('platform')
  const [state, setState] = useState<WorkflowState>({ platform: null, contentType: null, mood: null })
  const [messages, setMessages] = useState<Message[]>([])
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [savedId, setSavedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const profile = getProfile()

  useEffect(() => {
    // Pre-fill from quick-start params
    const ct = params.get('contentType') as ContentType | null
    const mood = params.get('mood') as Mood | null

    if (ct || mood) {
      const initial: WorkflowState = { platform: null, contentType: ct, mood: mood }
      setState(initial)
    }

    setMessages([{
      role: 'agent',
      text: `Hej${profile?.name ? ' ' + profile.name : ''}! Jaki typ contentu chcesz dziś stworzyć?`,
      tiles: CONTENT_TYPES.map(c => ({ label: c.type, icon: c.icon, sub: c.sub })),
    }])

    if (ct) {
      // Skip to platform step
      setTimeout(() => pickContentType(ct, { platform: null, contentType: ct, mood: mood }), 100)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(msg: Message) {
    setMessages(prev => [...prev, msg])
  }

  function pickContentType(ct: ContentType, s?: WorkflowState) {
    const newState = { ...(s || state), contentType: ct }
    setState(newState)
    addMessage({ role: 'user', text: ct })
    setTimeout(() => {
      addMessage({
        role: 'agent',
        text: 'Super! Gdzie to wrzucasz?',
        chips: PLATFORMS,
      })
      setStep('platform')
    }, 300)
  }

  function pickPlatform(p: Platform) {
    const newState = { ...state, platform: p }
    setState(newState)
    addMessage({ role: 'user', text: p })
    setTimeout(() => {
      addMessage({
        role: 'agent',
        text: 'Ostatnie pytanie — chcesz trafić w trend czy coś ponadczasowego?',
        chips: MOODS,
      })
      setStep('mood')
    }, 300)
  }

  function pickMood(m: Mood) {
    const newState = { ...state, mood: m }
    setState(newState)
    addMessage({ role: 'user', text: m })
    setStep('generating')
    addMessage({ role: 'agent', text: '__typing__' })
    generateIdeas(newState)
  }

  async function generateIdeas(s: WorkflowState) {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: s.platform,
          contentType: s.contentType,
          mood: s.mood,
          niches: profile?.niches || [],
        }),
      })
      const data = await res.json()
      const generated: ContentIdea[] = (data.ideas || []).map((i: ContentIdea, idx: number) => ({
        ...i,
        id: generateId(),
        hot: idx === 0 && s.mood === 'Trend teraz',
      }))
      setIdeas(generated)
      setMessages(prev => prev.filter(m => m.text !== '__typing__'))
      addMessage({
        role: 'agent',
        text: `Mam dla Ciebie ${generated.length} pomysły! Oto one:`,
        ideas: generated,
      })
      setStep('result')
    } catch {
      setMessages(prev => prev.filter(m => m.text !== '__typing__'))
      addMessage({ role: 'agent', text: 'Coś poszło nie tak. Spróbuj jeszcze raz.' })
      setStep('mood')
    }
  }

  function handleSave() {
    if (!state.platform || !state.contentType || !state.mood) return
    const id = generateId()
    addToHistory({
      id,
      ideas,
      platform: state.platform,
      contentType: state.contentType,
      mood: state.mood,
      createdAt: new Date().toISOString(),
      saved: true,
      used: false,
    })
    setSavedId(id)
    addMessage({ role: 'agent', text: 'Zapisano! Znajdziesz to w Historii.' })
  }

  function handleReset() {
    setState({ platform: null, contentType: null, mood: null })
    setStep('platform')
    setIdeas([])
    setSavedId(null)
    setMessages([{
      role: 'agent',
      text: 'Zaczynamy od nowa! Jaki typ contentu tym razem?',
      tiles: CONTENT_TYPES.map(c => ({ label: c.type, icon: c.icon, sub: c.sub })),
    }])
  }

  return (
    <div className="flex flex-col flex-1 pb-20">
      {/* Topbar */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[#1e1e22]">
        <button onClick={() => router.push('/')} className="text-[#666] text-sm mr-1">←</button>
        <div className="w-8 h-8 rounded-full bg-[var(--purple)] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">IN</div>
        <div>
          <p className="text-[13px] font-medium text-white leading-tight">Inspirio Agent</p>
          <p className="text-[11px] text-[var(--green)]">
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--green)] mr-1 align-middle"></span>
            aktywny
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 fade-up ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.text === '__typing__' ? (
              <div className="bubble-agent flex gap-1 items-center px-4 py-3">
                <span className="typing-dot w-2 h-2 bg-[#666] rounded-full inline-block"></span>
                <span className="typing-dot w-2 h-2 bg-[#666] rounded-full inline-block"></span>
                <span className="typing-dot w-2 h-2 bg-[#666] rounded-full inline-block"></span>
              </div>
            ) : msg.role === 'user' ? (
              <div className="bubble-user">{msg.text}</div>
            ) : (
              <>
                {msg.text && <div className="bubble-agent">{msg.text}</div>}

                {/* Tiles for content type */}
                {msg.tiles && step === 'platform' || (msg.tiles && i === 0) ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {msg.tiles.map(t => (
                      <div key={t.label} onClick={() => step !== 'generating' && step !== 'result' && !state.contentType && pickContentType(t.label as ContentType)} className="tile">
                        <div className="text-base mb-1">{t.icon}</div>
                        <p className="text-[12px] font-medium text-[#ddd]">{t.label}</p>
                        <p className="text-[11px] text-[#444]">{t.sub}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Chips */}
                {msg.chips && (
                  <div className="flex flex-wrap gap-2">
                    {msg.chips.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          if (step === 'platform') pickPlatform(c as Platform)
                          else if (step === 'mood') pickMood(c as Mood)
                        }}
                        className="chip"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Ideas */}
                {msg.ideas && (
                  <div className="flex flex-col gap-3 w-full">
                    {msg.ideas.map((idea, idx) => (
                      <div key={idea.id} className={`result-card ${idea.hot ? 'hot' : ''}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--purple)] mb-2">
                          {idea.hot ? '🔥 ' : ''}Pomysł #{idx + 1}
                        </p>
                        <p className="text-[13px] font-semibold text-white mb-2 leading-snug">{idea.title}</p>
                        <p className="text-[12px] text-[#888] leading-relaxed">{idea.body}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {idea.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-1 rounded-lg bg-[#1e1e26] text-[var(--purple)] border border-[#2a2a32] font-medium">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={handleSave}
                        disabled={!!savedId}
                        className="flex-1 bg-[var(--purple)] text-white rounded-xl py-3 text-[12px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
                      >
                        {savedId ? 'Zapisano ✓' : 'Zapisz wszystkie'}
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex-1 bg-[#18181b] border border-[#2a2a2e] text-[#888] rounded-xl py-3 text-[12px] font-semibold active:scale-[0.98] transition-transform"
                      >
                        Nowe pomysły
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-1.5 py-2 border-t border-[#1e1e22]">
        {(['platform', 'mood', 'result'] as const).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === s || (step === 'generating' && i === 1) || (step === 'result' && i === 2)
                ? 'w-5 bg-[var(--purple)]'
                : 'w-1.5 bg-[#2a2a2e]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateInner />
    </Suspense>
  )
}
