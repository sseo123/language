import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, KeyRound, RotateCcw, X } from 'lucide-react'
import { CaptureOverlay, type CapturePhase, type Rect } from '@/components/overlay/capture-overlay'
import { ExplanationPanel } from '@/components/overlay/explanation-panel'
import { SaveFlight, type Flight } from '@/components/overlay/save-flight'
import { VoiceCapsule } from '@/components/overlay/voice-capsule'
import { Kbd } from '@/components/brand'
import { langInfo, SPOKEN_QUESTION, type Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { api, emitEvent, fileUrl, onEvent, type CropResult, type FramePayload, type SessionInfo } from '@/lib/tauri'
import { useVoiceInput } from '@/lib/voice'

type Phase = CapturePhase | 'error'

/**
 * Runs inside the transparent full-screen overlay window. One instance lives
 * for the whole app; Rust sends `capture:start` every time the hotkey fires.
 */
export function CaptureSession() {
  const { settings, isSaved, saveWord } = useStore()
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState('')
  const [crop, setCrop] = useState<CropResult | null>(null)
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const cropPromise = useRef<Promise<CropResult> | null>(null)
  const sessionRef = useRef<SessionInfo | null>(null)
  sessionRef.current = session

  const fail = useCallback((message: string) => {
    setError(message)
    setPhase('error')
  }, [])

  const voice = useVoiceInput(settings.model, fail)
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  const resetAll = useCallback(() => {
    voiceRef.current.cancel()
    cropPromise.current = null
    setPhase(null)
    setRect(null)
    setCrop(null)
    setPhrase(null)
    setQuestion('')
    setAskedQuestion('')
    setError(null)
    setFrameUrl(null)
    setFlights([])
  }, [])

  const dismiss = useCallback(() => {
    resetAll()
    setSession(null)
    void api.endCapture()
  }, [resetAll])

  // Events from Rust.
  useEffect(() => {
    const begin = (info: SessionInfo) => {
      resetAll()
      setSession(info)
      setPhase('selecting')
    }
    const offStart = onEvent<SessionInfo>('capture:start', begin)
    // A capture can start before this page has finished loading.
    api
      .currentCapture()
      .then((info) => {
        if (info && !sessionRef.current) begin(info)
      })
      .catch(() => {})
    const offFrame = onEvent<FramePayload>('capture:frame', (p) => {
      if (sessionRef.current?.sessionId !== p.sessionId) return
      setFrameUrl(fileUrl(p.path) ?? null)
      setSession((s) => (s ? { ...s, source: p.source } : s))
    })
    const offError = onEvent<{ message: string }>('capture:error', (p) => fail(p.message))
    return () => {
      offStart()
      offFrame()
      offError()
    }
  }, [resetAll, fail])

  // Rust keeps the window hidden until the session is actually on screen.
  const sessionId = session?.sessionId
  useEffect(() => {
    if (!sessionId) return
    api.captureReady(sessionId).catch(() => {
      resetAll()
      setSession(null)
    })
  }, [sessionId, resetAll])

  // DEV-ONLY scripted flow for automated testing. Remove before release.
  const submitRef = useRef<(text?: string) => Promise<void>>(async () => {})
  const onSelectedRef = useRef<(r: Rect) => void>(() => {})
  useEffect(() => {
    if (!import.meta.env.DEV) return
    return onEvent<{ rect: Rect; question?: string; wait?: number }>('dev:script', (s) => {
      onSelectedRef.current(s.rect)
      setTimeout(() => void submitRef.current(s.question ?? ''), s.wait ?? 2500)
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  const ocrLangs = () => {
    const codes = [settings.learningLang, settings.comfortLang, ...settings.speakLangs]
    return [...new Set(codes.map((c) => langInfo(c).locale))]
  }

  const onSelected = (r: Rect) => {
    const s = sessionRef.current
    if (!s) return
    setRect(r)
    setPhase('listening')
    setCrop(null)
    const p = api.cropFrame(s.sessionId, r, ocrLangs())
    cropPromise.current = p
    p.then(setCrop).catch((e) => fail(e instanceof Error ? e.message : String(e)))
  }

  const submit = useCallback(
    async (text?: string) => {
      const s = sessionRef.current
      if (!s || !cropPromise.current) return
      const q = (text ?? question).trim()
      setAskedQuestion(q || SPOKEN_QUESTION[settings.comfortLang])
      setPhase('thinking')
      try {
        await cropPromise.current
        const result = await api.explain({
          sessionId: s.sessionId,
          question: q,
          comfortLang: settings.comfortLang,
          learningLang: settings.learningLang,
          config: settings.model,
        })
        setPhrase(result)
        setPhase('answer')
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e))
      }
    },
    [question, settings, fail],
  )

  submitRef.current = submit
  onSelectedRef.current = onSelected

  const toggleMic = async () => {
    if (voice.state === 'recording') {
      const text = await voice.stop()
      if (text) {
        setQuestion(text)
        void submit(text)
      }
    } else {
      void voice.start()
    }
  }

  const askAgain = () => {
    setQuestion('')
    setPhrase(null)
    setPhase('listening')
  }

  const handleSave = (from: DOMRect) => {
    if (!phrase) return
    saveWord(phrase)
    // Fly toward the menu bar, where Teachya lives.
    const to = { x: window.innerWidth - 160, y: 12 }
    setFlights((f) => [...f, { id: Date.now(), term: phrase.term, from: { x: from.left + from.width / 2, y: from.top + from.height / 2 }, to }])
  }

  const openSettings = () => {
    emitEvent('app:navigate', { view: 'settings' })
    void api.showMain()
    dismiss()
  }

  if (!phase || !session) return null

  const showFrame = phase !== 'answer'
  const overlayPhase: CapturePhase = phase === 'error' ? 'thinking' : phase

  return (
    <div className="fixed inset-0 cursor-default select-none">
      {showFrame && frameUrl && (
        <img src={frameUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" style={{ imageRendering: 'auto' }} />
      )}

      <CaptureOverlay phase={overlayPhase} rect={rect} onSelected={onSelected} onDismiss={dismiss} />

      {rect && (phase === 'listening' || phase === 'thinking') && (
        <VoiceCapsule
          rect={rect}
          phase={phase}
          value={question}
          onChange={setQuestion}
          onSubmit={() => void submit()}
          speakLangs={settings.speakLangs}
          detected={settings.comfortLang}
          mic={voice.state}
          onToggleMic={() => void toggleMic()}
          status={!crop ? 'Reading the text in your selection…' : crop.text ? 'Text recognized. Ask away.' : 'No text found. The screenshot will be sent instead.'}
        />
      )}

      {rect && phrase && phase === 'answer' && (
        <ExplanationPanel
          key={phrase.id}
          phrase={phrase}
          lang={settings.comfortLang}
          question={askedQuestion}
          rect={rect}
          saved={isSaved(phrase.id)}
          onSave={handleSave}
          onClose={dismiss}
          onAskAgain={askAgain}
        />
      )}

      {phase === 'error' && error && (
        <ErrorCard
          rect={rect}
          message={error}
          onRetry={rect && cropPromise.current ? () => void submit() : undefined}
          onSettings={error === 'NO_API_KEY' ? openSettings : undefined}
          onClose={dismiss}
        />
      )}

      {flights.map((f) => (
        <SaveFlight key={f.id} flight={f} onLand={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}
    </div>
  )
}

function ErrorCard({
  rect,
  message,
  onRetry,
  onSettings,
  onClose,
}: {
  rect: Rect | null
  message: string
  onRetry?: () => void
  onSettings?: () => void
  onClose: () => void
}) {
  const WIDTH = 380
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = rect ? Math.min(Math.max(rect.x + rect.w / 2 - WIDTH / 2, 12), vw - WIDTH - 12) : vw / 2 - WIDTH / 2
  const top = rect ? Math.min(rect.y + rect.h + 16, vh - 200) : vh / 2 - 80
  const noKey = message === 'NO_API_KEY'
  return (
    <div
      role="alert"
      className="fixed z-[70] overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1117]/85 p-4 text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
      style={{ left, top, width: WIDTH }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          {noKey ? <KeyRound className="size-4" /> : <AlertTriangle className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{noKey ? 'Add an API key to get explanations' : 'That didn’t work'}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/65">
            {noKey ? 'Teachya sends your selection to the model you choose. Paste a key once in Settings and it is kept in your Keychain.' : message}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {onSettings && (
          <button type="button" onClick={onSettings} className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-brand-foreground hover:brightness-110">
            Open Settings
          </button>
        )}
        {onRetry && !noKey && (
          <button type="button" onClick={onRetry} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-medium hover:bg-white/15">
            <RotateCcw className="size-3.5" /> Try again
          </button>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-white/40">
          <Kbd dark>esc</Kbd> close
        </span>
      </div>
    </div>
  )
}
