import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isLangCode, parsePhrase, type LangCode, type Phrase } from './content'
import { MOCK_DECK } from './mock-vocab'
import { api, emitEvent, isTauri, onEvent, type ModelConfig } from './tauri'

export type Settings = {
  comfortLang: LangCode
  speakLangs: LangCode[]
  learningLang: LangCode
  hotkey: string
  model: ModelConfig
}

export const DEFAULT_MODEL: ModelConfig = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemma-4-31b-it',
  transcribeModel: 'gemini-flash-latest',
  sendScreenshot: true,
}

export const DEFAULT_HOTKEY = 'Alt+Space'

export const DEFAULT_SETTINGS: Settings = {
  comfortLang: 'en',
  speakLangs: ['en'],
  learningLang: 'ko',
  hotkey: DEFAULT_HOTKEY,
  model: DEFAULT_MODEL,
}

export type VocabEntry = {
  phrase: Phrase
  /** Unix ms when the word was saved. */
  savedAt: number
  mastery: number
  attempts: number
  misses: number
}

export type AppView = 'today' | 'vocabulary' | 'practice' | 'settings'

type Store = {
  hydrated: boolean
  onboarded: boolean
  completeOnboarding: (s: Partial<Settings>) => void
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
  vocab: VocabEntry[]
  isSaved: (id: string) => boolean
  saveWord: (phrase: Phrase) => void
  removeWord: (id: string) => void
  recordAnswer: (id: string, correct: boolean) => void
  weakest: (n?: number) => VocabEntry[]
  streak: number
  longestStreak: number
  appView: AppView
  setAppView: (v: AppView) => void
}

const StoreContext = createContext<Store | null>(null)

const STORAGE_KEY = 'teachya-state-v2'
const SYNC_EVENT = 'store:changed'
const WINDOW_ID = Math.random().toString(36).slice(2)

type Persisted = { onboarded: boolean; settings: Settings; vocab: VocabEntry[]; reviewDays: string[] }

function parseSettings(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (!isLangCode(s.comfortLang) || !isLangCode(s.learningLang) || s.comfortLang === s.learningLang) return null
  const speakLangs = Array.isArray(s.speakLangs) ? s.speakLangs.filter(isLangCode) : []
  let model = (s.model ?? {}) as Record<string, unknown>
  // Settings saved before Gemma became the default still hold the untouched OpenAI defaults.
  if (model.baseUrl === 'https://api.openai.com/v1' && model.model === 'gpt-4o-mini') {
    model = { ...DEFAULT_MODEL, sendScreenshot: model.sendScreenshot }
  }
  return {
    comfortLang: s.comfortLang,
    learningLang: s.learningLang,
    speakLangs: [...new Set([s.comfortLang, ...speakLangs])],
    hotkey: typeof s.hotkey === 'string' && s.hotkey ? s.hotkey : DEFAULT_HOTKEY,
    model: {
      baseUrl: typeof model.baseUrl === 'string' && model.baseUrl ? model.baseUrl : DEFAULT_MODEL.baseUrl,
      model: typeof model.model === 'string' && model.model ? model.model : DEFAULT_MODEL.model,
      transcribeModel: typeof model.transcribeModel === 'string' && model.transcribeModel ? model.transcribeModel : DEFAULT_MODEL.transcribeModel,
      sendScreenshot: typeof model.sendScreenshot === 'boolean' ? model.sendScreenshot : DEFAULT_MODEL.sendScreenshot,
    },
  }
}

function readStoredState(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    const state = data as Record<string, unknown>
    const settings = parseSettings(state.settings)
    if (!settings) return null
    const seen = new Set<string>()
    const vocab: VocabEntry[] = []
    for (const item of Array.isArray(state.vocab) ? state.vocab : []) {
      if (!item || typeof item !== 'object') continue
      const entry = item as Record<string, unknown>
      const phrase = parsePhrase(entry.phrase)
      if (!phrase || seen.has(phrase.id)) continue
      if (typeof entry.mastery !== 'number' || !Number.isFinite(entry.mastery)) continue
      if (typeof entry.attempts !== 'number' || !Number.isInteger(entry.attempts) || entry.attempts < 0) continue
      if (typeof entry.misses !== 'number' || !Number.isInteger(entry.misses) || entry.misses < 0 || entry.misses > entry.attempts) continue
      seen.add(phrase.id)
      vocab.push({
        phrase,
        savedAt: typeof entry.savedAt === 'number' && Number.isFinite(entry.savedAt) ? entry.savedAt : 0,
        mastery: Math.max(0, Math.min(1, entry.mastery)),
        attempts: entry.attempts,
        misses: entry.misses,
      })
    }
    if (vocab.length === 0) {
      const now = Date.now()
      vocab.push(
        ...MOCK_DECK.map((item) => ({
          phrase: item.phrase,
          savedAt: now - item.daysAgo * 86_400_000,
          mastery: item.mastery,
          attempts: item.attempts,
          misses: item.misses,
        })),
      )
    }
    const reviewDays = Array.isArray(state.reviewDays)
      ? [...new Set(state.reviewDays.filter((day): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort()
      : []
    return { onboarded: state.onboarded === true, settings, vocab, reviewDays }
  } catch {
    return null
  }
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function streakStats(days: string[]): { streak: number; longestStreak: number } {
  const reviewed = new Set(days)
  const today = new Date()
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!reviewed.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (reviewed.has(localDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  let longestStreak = 0
  let run = 0
  let previous: Date | null = null
  for (const day of days) {
    const current = new Date(`${day}T12:00:00`)
    if (Number.isNaN(current.getTime()) || localDay(current) !== day) continue
    if (previous) {
      const next = new Date(previous)
      next.setDate(next.getDate() + 1)
      run = localDay(next) === day ? run + 1 : 1
    } else {
      run = 1
    }
    longestStreak = Math.max(longestStreak, run)
    previous = current
  }
  return { streak: Math.max(streak, 0), longestStreak: Math.max(longestStreak, streak) }
}

export const weaknessScore = (v: VocabEntry) => (v.misses + 1) / (v.attempts + 2) + (1 - v.mastery)

/** "Just now", "Today", "Yesterday", "3 days ago", or a short date. */
export function formatSaved(savedAt: number, now = Date.now()): string {
  if (!savedAt) return ''
  const diff = now - savedAt
  if (diff < 90_000) return 'Just now'
  const start = (t: number) => {
    const d = new Date(t)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const days = Math.round((start(now) - start(savedAt)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return new Date(savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const isFreshlySaved = (v: VocabEntry, now = Date.now()) => now - v.savedAt < 90_000

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [vocab, setVocab] = useState<VocabEntry[]>([])
  const [reviewDays, setReviewDays] = useState<string[]>([])
  const [appView, setAppView] = useState<AppView>('today')
  // Set while applying state that arrived from another window, so we do not echo it back.
  const applyingRemote = useRef(false)

  const applyStored = useCallback((stored: Persisted | null) => {
    if (!stored) return
    applyingRemote.current = true
    setOnboarded(stored.onboarded)
    setSettings(stored.settings)
    setVocab(stored.vocab)
    setReviewDays(stored.reviewDays)
  }, [])

  useEffect(() => {
    applyStored(readStoredState())
    setHydrated(true)
  }, [applyStored])

  // Persist, and tell other windows (the capture overlay and the main window
  // each run their own copy of this store).
  useEffect(() => {
    if (!hydrated) return
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded, settings, vocab, reviewDays }))
    } catch {
      // The app remains usable when storage is unavailable.
    }
    emitEvent(SYNC_EVENT, { from: WINDOW_ID })
  }, [hydrated, onboarded, settings, vocab, reviewDays])

  useEffect(() => {
    const reload = () => applyStored(readStoredState())
    const offTauri = onEvent<{ from: string }>(SYNC_EVENT, (p) => {
      if (p?.from !== WINDOW_ID) reload()
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      offTauri()
      window.removeEventListener('storage', onStorage)
    }
  }, [applyStored])

  // Keep the native hotkey in sync with settings.
  useEffect(() => {
    if (!hydrated || !isTauri) return
    api.setHotkey(settings.hotkey).catch(() => {})
  }, [hydrated, settings.hotkey])

  const completeOnboarding = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...s }))
    setOnboarded(true)
  }, [])

  const updateSettings = useCallback((s: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...s })), [])

  const isSaved = useCallback((id: string) => vocab.some((v) => v.phrase.id === id), [vocab])

  const saveWord = useCallback((phrase: Phrase) => {
    setVocab((prev) =>
      prev.some((v) => v.phrase.id === phrase.id) ? prev : [{ phrase, savedAt: Date.now(), mastery: 0, attempts: 0, misses: 0 }, ...prev],
    )
  }, [])

  const removeWord = useCallback((id: string) => setVocab((prev) => prev.filter((v) => v.phrase.id !== id)), [])

  const recordAnswer = useCallback((id: string, correct: boolean) => {
    setReviewDays((prev) => {
      const day = localDay(new Date())
      return prev.includes(day) ? prev : [...prev, day].sort()
    })
    setVocab((prev) =>
      prev.map((v) =>
        v.phrase.id !== id
          ? v
          : {
              ...v,
              attempts: v.attempts + 1,
              misses: correct ? v.misses : v.misses + 1,
              mastery: Math.max(0, Math.min(1, v.mastery + (correct ? 0.15 : -0.1))),
            },
      ),
    )
  }, [])

  const { streak, longestStreak } = useMemo(() => streakStats(reviewDays), [reviewDays])

  const weakest = useCallback((n = 3) => [...vocab].sort((a, b) => weaknessScore(b) - weaknessScore(a)).slice(0, n), [vocab])

  const value = useMemo<Store>(
    () => ({
      hydrated,
      onboarded,
      completeOnboarding,
      settings,
      updateSettings,
      vocab,
      isSaved,
      saveWord,
      removeWord,
      recordAnswer,
      weakest,
      streak,
      longestStreak,
      appView,
      setAppView,
    }),
    [hydrated, onboarded, completeOnboarding, settings, updateSettings, vocab, isSaved, saveWord, removeWord, recordAnswer, weakest, streak, longestStreak, appView],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
