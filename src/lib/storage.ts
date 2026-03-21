import type { UserProfile, HistoryItem } from './types'

const PROFILE_KEY = 'inspirio_profile'
const HISTORY_KEY = 'inspirio_history'

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addToHistory(item: HistoryItem) {
  const history = getHistory()
  history.unshift(item)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

export function updateHistoryItem(id: string, updates: Partial<HistoryItem>) {
  const history = getHistory()
  const idx = history.findIndex(h => h.id === id)
  if (idx !== -1) {
    history[idx] = { ...history[idx], ...updates }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}
