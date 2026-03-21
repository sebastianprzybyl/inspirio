'use client'
import { useRouter } from 'next/navigation'

type Tab = 'home' | 'generate' | 'history'

export default function BottomNav({ active }: { active: Tab }) {
  const router = useRouter()

  const tabs = [
    {
      id: 'home' as Tab,
      label: 'Home',
      path: '/',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9v9a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1z"/>
        </svg>
      ),
    },
    {
      id: 'generate' as Tab,
      label: 'Generuj',
      path: '/generate',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
    {
      id: 'history' as Tab,
      label: 'Historia',
      path: '/history',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="w-full max-w-sm bottom-nav bg-[#0E0E10] flex justify-around items-center py-3 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className={`flex flex-col items-center gap-1 px-4 transition-colors ${
              active === tab.id ? 'text-[var(--purple)]' : 'text-[#444]'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
