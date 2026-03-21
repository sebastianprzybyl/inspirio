'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getHistory } from '@/lib/storage'
import type { UserProfile, HistoryItem } from '@/lib/types'
import BottomNav from '@/components/BottomNav'

const QUICK_START = [
  { icon: '🎬', label: 'Reels na dziś', sub: 'trendujące', params: 'contentType=Reels&mood=Trend+teraz' },
  { icon: '🖼', label: 'Karuzela porady', sub: 'evergreen', params: 'contentType=Karuzela&mood=Evergreen' },
  { icon: '💬', label: 'Stories Q&A', sub: 'interakcja', params: 'contentType=Stories&mood=Evergreen' },
  { icon: '🎲', label: 'Niespodzianka', sub: 'losuj format', params: 'mood=Zaskocz+mnie' },
]

export default function HomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const p = getProfile()
    if (!p) { router.replace('/onboarding'); return }
    setProfile(p)
    const h = getHistory()
    setHistory(h)
    // simple streak: count consecutive days
    const days = new Set(h.map(i => i.createdAt.split('T')[0]))
    setStreak(days.size)
  }, [router])

  if (!profile) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór'

  return (
    <div className="flex flex-col flex-1 pb-20 fade-up">
      {/* Header */}
      <div className="px-5 pt-8 pb-2">
        <p className="text-xl font-semibold text-white">{greeting}, {profile.name}!</p>
        <p className="text-sm text-[#666] mt-1">Co dziś nagrywamy?</p>
      </div>

      {/* CTA */}
      <div
        onClick={() => router.push('/generate')}
        className="mx-5 mt-4 bg-[var(--purple)] rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <p className="text-[13px] text-[#CECBF6] mb-1">Nowy pomysł na content</p>
        <h3 className="text-base font-semibold text-white">Wygeneruj teraz →</h3>
      </div>

      {/* Quick start */}
      <div className="px-5 mt-6">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#444] mb-3">Szybki start</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_START.map(q => (
            <div
              key={q.label}
              onClick={() => router.push(`/generate?${q.params}`)}
              className="tile cursor-pointer active:scale-[0.97] transition-transform"
            >
              <div className="text-base mb-1">{q.icon}</div>
              <p className="text-[12px] font-medium text-[#ddd]">{q.label}</p>
              <p className="text-[11px] text-[#444]">{q.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="mx-5 mt-4 bg-[#18181b] border border-[#2a2a2e] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#ddd]">Seria dni</p>
            <p className="text-[11px] text-[#666]">tworzysz regularnie!</p>
          </div>
          <span className="text-lg font-semibold text-[var(--amber)]">🔥 {streak}</span>
        </div>
      )}

      {/* Recent */}
      {history.length > 0 && (
        <div className="px-5 mt-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#444] mb-3">Ostatnio</p>
          <div className="flex flex-col gap-2">
            {history.slice(0, 2).map(item => (
              <div
                key={item.id}
                onClick={() => router.push('/history')}
                className="bg-[#18181b] border border-[#2a2a2e] rounded-xl p-3 flex items-center gap-3 cursor-pointer active:opacity-70"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1a1828] flex items-center justify-center text-sm flex-shrink-0">
                  {item.contentType === 'Reels' ? '🎬' : item.contentType === 'Karuzela' ? '🖼' : item.contentType === 'Stories' ? '💬' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#ddd] truncate">{item.ideas[0]?.title}</p>
                  <p className="text-[11px] text-[#444]">{item.platform} · {item.contentType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
