'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { PHRASE_MAP, type LangCode, type Phrase } from './content'

export type Settings = {
  comfortLang: LangCode
  speakLangs: LangCode[]
  learningLang: LangCode
}

export type VocabEntry = {
  phraseId: string
  savedLabel: string
  mastery: number
  attempts: number
  misses: number
}

export type AppView = 'today' | 'vocabulary' | 'practice' | 'settings'

type Store = {
  onboarded: boolean
  completeOnboarding: (s: Settings) => void
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
  vocab: VocabEntry[]
  isSaved: (id: string) => boolean
  saveWord: (id: string) => void
  recordAnswer: (id: string, correct: boolean) => void
  weakest: (n?: number) => (VocabEntry & { phrase: Phrase })[]
  appOpen: boolean
  openApp: (view?: AppView) => void
  closeApp: () => void
  appView: AppView
  setAppView: (v: AppView) => void
  dockPulse: number
  pulseDock: () => void
}

const StoreContext = createContext<Store | null>(null)

const SEED: VocabEntry[] = [
  { phraseId: 'dapjeongneo', savedLabel: 'Yesterday', mastery: 0.25, attempts: 4, misses: 3 },
  { phraseId: 'lowkey', savedLabel: '2 days ago', mastery: 0.45, attempts: 3, misses: 2 },
  { phraseId: 'eoieopda', savedLabel: '3 days ago', mastery: 0.7, attempts: 5, misses: 1 },
  { phraseId: 'seonbae', savedLabel: 'Last week', mastery: 0.9, attempts: 6, misses: 0 },
]

export const weaknessScore = (v: VocabEntry) => (v.misses + 1) / (v.attempts + 2) + (1 - v.mastery)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [onboarded, setOnboarded] = useState(false)
  const [settings, setSettings] = useState<Settings>({ comfortLang: 'en', speakLangs: ['en'], learningLang: 'ko' })
  const [vocab, setVocab] = useState<VocabEntry[]>(SEED)
  const [appOpen, setAppOpen] = useState(false)
  const [appView, setAppView] = useState<AppView>('today')
  const [dockPulse, setDockPulse] = useState(0)

  const completeOnboarding = useCallback((s: Settings) => {
    setSettings(s)
    setOnboarded(true)
  }, [])

  const updateSettings = useCallback((s: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...s })), [])

  const isSaved = useCallback((id: string) => vocab.some((v) => v.phraseId === id), [vocab])

  const saveWord = useCallback((id: string) => {
    setVocab((prev) =>
      prev.some((v) => v.phraseId === id)
        ? prev
        : [{ phraseId: id, savedLabel: 'Just now', mastery: 0, attempts: 0, misses: 0 }, ...prev],
    )
  }, [])

  const recordAnswer = useCallback((id: string, correct: boolean) => {
    setVocab((prev) =>
      prev.map((v) =>
        v.phraseId !== id
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

  const weakest = useCallback(
    (n = 3) =>
      [...vocab]
        .sort((a, b) => weaknessScore(b) - weaknessScore(a))
        .slice(0, n)
        .map((v) => ({ ...v, phrase: PHRASE_MAP[v.phraseId] })),
    [vocab],
  )

  const openApp = useCallback((view?: AppView) => {
    if (view) setAppView(view)
    setAppOpen(true)
  }, [])

  const value = useMemo<Store>(
    () => ({
      onboarded,
      completeOnboarding,
      settings,
      updateSettings,
      vocab,
      isSaved,
      saveWord,
      recordAnswer,
      weakest,
      appOpen,
      openApp,
      closeApp: () => setAppOpen(false),
      appView,
      setAppView,
      dockPulse,
      pulseDock: () => setDockPulse((p) => p + 1),
    }),
    [onboarded, completeOnboarding, settings, updateSettings, vocab, isSaved, saveWord, recordAnswer, weakest, appOpen, openApp, appView, dockPulse],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
