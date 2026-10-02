'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { PHRASE_MAP, SPOKEN_QUESTION, type Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { AppWindow } from '../app/app-window'
import { Kbd } from '../brand'
import { CaptureOverlay, type CapturePhase, type Rect } from '../overlay/capture-overlay'
import { ExplanationPanel } from '../overlay/explanation-panel'
import { SaveFlight, type Flight } from '../overlay/save-flight'
import { VoiceCapsule } from '../overlay/voice-capsule'
import { BrowserWindow } from './browser-window'
import { Dock } from './dock'
import { MenuBar } from './menu-bar'

function findPhrase(rect: Rect): Phrase {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-phrase]'))
  let best: { id: string; score: number } | null = null
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  for (const n of nodes) {
    const b = n.getBoundingClientRect()
    const ix = Math.max(0, Math.min(rect.x + rect.w, b.right) - Math.max(rect.x, b.left))
    const iy = Math.max(0, Math.min(rect.y + rect.h, b.bottom) - Math.max(rect.y, b.top))
    const overlap = (ix * iy) / Math.max(1, b.width * b.height)
    const dist = Math.hypot(cx - (b.left + b.width / 2), cy - (b.top + b.height / 2))
    const score = overlap * 10_000 - dist
    if (!best || score > best.score) best = { id: n.dataset.phrase!, score }
  }
  return PHRASE_MAP[best?.id ?? 'nunchi']
}

export function Desktop() {
  const { settings, isSaved, saveWord, pulseDock, appOpen } = useStore()
  const [phase, setPhase] = useState<CapturePhase | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [transcript, setTranscript] = useState('')
  const [flights, setFlights] = useState<Flight[]>([])
  const [coach, setCoach] = useState(true)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const question = SPOKEN_QUESTION[settings.comfortLang]

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const reset = useCallback(() => {
    clearTimers()
    setPhase(null)
    setRect(null)
    setTranscript('')
  }, [])

  const startCapture = useCallback(() => {
    clearTimers()
    setCoach(false)
    setTranscript('')
    setRect(null)
    setPhase('selecting')
  }, [])

  const submit = useCallback(() => {
    clearTimers()
    setTranscript(question)
    setPhase('thinking')
    timers.current.push(setTimeout(() => setPhase('answer'), 1500))
  }, [question])

  const listen = useCallback(() => {
    clearTimers()
    setTranscript('')
    setPhase('listening')
    const words = question.split(' ')
    words.forEach((_, i) => {
      timers.current.push(setTimeout(() => setTranscript(words.slice(0, i + 1).join(' ')), 900 + i * 260))
    })
    timers.current.push(setTimeout(submit, 900 + words.length * 260 + 1100))
  }, [question, submit])

  const onSelected = (r: Rect) => {
    setRect(r)
    setPhrase(findPhrase(r))
    listen()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault()
        startCapture()
      } else if (e.key === 'Escape' && phase) {
        reset()
      } else if (e.key === 'Enter' && phase === 'listening' && !e.isComposing && e.keyCode !== 229) {
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, startCapture, reset, submit])

  useEffect(() => clearTimers, [])

  const handleSave = (from: DOMRect) => {
    if (!phrase) return
    const target = document.getElementById('lumen-dock')?.getBoundingClientRect()
    const to = target ? { x: target.left + target.width / 2, y: target.top + target.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight - 40 }
    saveWord(phrase.id)
    setFlights((f) => [...f, { id: Date.now(), term: phrase.term, from: { x: from.left + from.width / 2, y: from.top + from.height / 2 }, to }])
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-cover bg-center" style={{ backgroundImage: 'url(/images/wallpaper.png)' }}>
      <MenuBar onCapture={startCapture} />

      <main className="relative flex-1">
        <div className="absolute inset-x-6 bottom-24 top-5 mx-auto max-w-[1180px]">
          <BrowserWindow />
        </div>
        {appOpen && <AppWindow />}

        {coach && !phase && (
          <div className="absolute right-5 top-4 z-30 w-80 rounded-2xl border border-white/10 bg-[#0d1117]/75 p-4 text-white shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-start justify-between">
              <p className="text-[13px] font-semibold">Lumen is running</p>
              <button type="button" onClick={() => setCoach(false)} aria-label="Dismiss tip" className="-mr-1 -mt-1 rounded p-1 text-white/40 hover:text-white">
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">
              Press{' '}
              <span className="inline-flex gap-1 align-middle">
                <Kbd dark>⌥</Kbd>
                <Kbd dark>Space</Kbd>
              </span>{' '}
              anywhere, then drag over something you don&apos;t understand — try{' '}
              <span className="text-white">{settings.learningLang === 'en' ? '“hits different”' : 'the subtitle “눈치”'}</span>.
            </p>
            <button
              type="button"
              onClick={startCapture}
              className="mt-3 h-8 w-full rounded-lg bg-white text-[13px] font-semibold text-black hover:bg-white/90"
            >
              Try it now
            </button>
          </div>
        )}
      </main>

      <Dock />

      {phase && <CaptureOverlay phase={phase} rect={rect} onSelected={onSelected} onDismiss={reset} />}

      {rect && (phase === 'listening' || phase === 'thinking') && (
        <VoiceCapsule
          rect={rect}
          phase={phase}
          transcript={transcript}
          speakLangs={settings.speakLangs}
          detected={settings.comfortLang}
          onStop={submit}
        />
      )}

      {rect && phrase && phase === 'answer' && (
        <ExplanationPanel
          key={phrase.id + rect.x}
          phrase={phrase}
          lang={settings.comfortLang}
          question={question}
          rect={rect}
          saved={isSaved(phrase.id)}
          onSave={handleSave}
          onClose={reset}
          onAskAgain={listen}
        />
      )}

      {flights.map((f) => (
        <SaveFlight
          key={f.id}
          flight={f}
          onLand={() => {
            setFlights((all) => all.filter((x) => x.id !== f.id))
            pulseDock()
          }}
        />
      ))}
    </div>
  )
}
