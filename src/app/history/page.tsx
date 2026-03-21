'use client'
import { useState, useEffect } from 'react'
import { getHistory, updateHistoryItem } from '@/lib/storage'
import type { HistoryItem, ContentType } from '@/lib/types'
import BottomNav from '@/components/BottomNav'

type Filter = 'Wszystkie' | 'Zapisane' | 'Użyte'

const ICONS: Record<ContentType, string> = {
  Reels: '🎬',
  Karuzela: '🖼',
  Stories: '💬',
  Post: '📝',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return 'Dziś'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return 'Dziś'
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Wczoraj'
  if (days < 7) return `${days} dni temu`
  return `${Math.floor(days / 7)} tyg. temu`
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState<Filter>('Wszystkie')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const filtered = history.filter(h => {
    if (filter === 'Zapisane') return h.saved
    if (filter === 'Użyte') return h.used
    return true
  })

  function toggleUsed(id: string) {
    updateHistoryItem(id, { used: !history.find(h => h.id === id)?.used })
    setHistory(getHistory())
  }

  return (
    <div className="flex flex-col flex-1 pb-20 fade-up">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-[#1e1e22]">
        <h1 className="text-xl font-semibold text-white mb-4">Historia</h1>
        <div className="flex gap-2">
          {(['Wszystkie', 'Zapisane', 'Użyte'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-2xl border transition-all ${
                filter === f
                  ? 'bg-[var(--purple-light)] border-[var(--purple)] text-[var(--purple-dark)]'
                  : 'bg-[#18181b] border-[#2a2a2e] text-[#666]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 mt-20">
            <span className="text-4xl">✨</span>
            <p className="text-[14px] text-[#666] text-center">Brak pomysłów w tej kategorii.<br/>Wygeneruj coś nowego!</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-[#18181b] border border-[#2a2a2e] rounded-2xl overflow-hidden">
              {/* Summary row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-[#1a1828] flex items-center justify-center text-base flex-shrink-0">
                  {ICONS[item.contentType]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#ddd] truncate">{item.ideas[0]?.title}</p>
                  <p className="text-[11px] text-[#444]">{timeAgo(item.createdAt)} · {item.platform} · {item.contentType}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.saved && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[#0f2820] text-[var(--green)] font-medium">Zapisane</span>
                  )}
                  <span className="text-[#444] text-xs">{expanded === item.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded ideas */}
              {expanded === item.id && (
                <div className="border-t border-[#2a2a2e] px-4 pb-4 pt-3 flex flex-col gap-3">
                  {item.ideas.map((idea, idx) => (
                    <div key={idea.id} className={`result-card ${idea.hot ? 'hot' : ''}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--purple)] mb-1">
                        {idea.hot ? '🔥 ' : ''}Pomysł #{idx + 1}
                      </p>
                      <p className="text-[12px] font-semibold text-white mb-1">{idea.title}</p>
                      <p className="text-[11px] text-[#888] leading-relaxed">{idea.body}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {idea.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-1 rounded-lg bg-[#1e1e26] text-[var(--purple)] border border-[#2a2a32] font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => toggleUsed(item.id)}
                    className="w-full mt-1 py-2.5 rounded-xl bg-[#222] border border-[#2a2a2e] text-[12px] font-medium text-[#888] active:scale-[0.98] transition-transform"
                  >
                    {item.used ? 'Oznacz jako nieużyte' : 'Oznacz jako użyte ✓'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav active="history" />
    </div>
  )
}
