'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile } from '@/lib/storage'
import type { Platform, Niche } from '@/lib/types'

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'YouTube', 'Twitch', 'X / Twitter']
const NICHES: Niche[] = ['Lifestyle', 'Fitness', 'Gotowanie', 'Gaming', 'Beauty', 'Biznes', 'Inne']

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [niches, setNiches] = useState<Niche[]>([])

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function handleStart() {
    if (!name.trim() || platforms.length === 0 || niches.length === 0) return
    saveProfile({ name: name.trim(), platforms, niches })
    router.push('/')
  }

  const ready = name.trim() && platforms.length > 0 && niches.length > 0

  return (
    <div className="flex flex-col flex-1 px-5 pt-10 pb-8 fade-up">
      {/* Logo */}
      <div className="w-11 h-11 rounded-2xl bg-[var(--purple)] flex items-center justify-center mb-8">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-white leading-tight mb-2">
        Hej! Powiedz mi coś o sobie.
      </h1>
      <p className="text-sm text-[#666] leading-relaxed mb-8">
        Dopasujemy pomysły do Twojego stylu i platform.
      </p>

      {/* Name */}
      <label className="text-[11px] font-medium uppercase tracking-widest text-[#444] mb-2 block">
        Jak masz na imię?
      </label>
      <input
        type="text"
        placeholder="Twoje imię..."
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-[#18181b] border border-[#2a2a2e] rounded-xl px-4 py-3 text-sm text-white placeholder-[#444] mb-6 outline-none focus:border-[var(--purple)] transition-colors"
      />

      {/* Platforms */}
      <label className="text-[11px] font-medium uppercase tracking-widest text-[#444] mb-3 block">
        Gdzie publikujesz?
      </label>
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setPlatforms(toggle(platforms, p))}
            className={`chip ${platforms.includes(p) ? 'selected' : ''}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Niches */}
      <label className="text-[11px] font-medium uppercase tracking-widest text-[#444] mb-3 block">
        Twoja nisza
      </label>
      <div className="flex flex-wrap gap-2 mb-auto">
        {NICHES.map(n => (
          <button
            key={n}
            onClick={() => setNiches(toggle(niches, n))}
            className={`chip ${niches.includes(n) ? 'selected' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={!ready}
        className="mt-8 w-full bg-[var(--purple)] text-white rounded-2xl py-4 text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        Zaczynamy →
      </button>
    </div>
  )
}
