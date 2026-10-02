import { useState } from 'react'
import { ArrowLeft, Layers, PenLine, Shuffle, Sparkles } from 'lucide-react'
import type { Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { ViewHeader } from './app-window'
import { Flashcards } from './games/flashcards'
import { Matching } from './games/matching'
import { FillBlank } from './games/fill-blank'

type Mode = 'flashcards' | 'matching' | 'fill'

const MODES: { id: Mode; title: string; desc: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { id: 'flashcards', title: 'Flashcards', desc: 'Recall the meaning, then flip to check.', icon: Layers, tint: 'from-sky-400/20 to-sky-400/0 text-sky-600' },
  { id: 'matching', title: 'Matching', desc: 'Pair each phrase with its meaning — fast.', icon: Shuffle, tint: 'from-violet-400/20 to-violet-400/0 text-violet-600' },
  { id: 'fill', title: 'Fill the blank', desc: 'Drop the word back into its real sentence.', icon: PenLine, tint: 'from-emerald-400/25 to-emerald-400/0 text-emerald-700' },
]

export function PracticeView() {
  const { weakest, vocab } = useStore()
  const [mode, setMode] = useState<Mode | null>(null)
  const [deck, setDeck] = useState<Phrase[]>([])
  const [round, setRound] = useState(0)

  const start = (m: Mode) => {
    const size = m === 'matching' ? 4 : 6
    setDeck(weakest(Math.min(size, vocab.length)).map((w) => w.phrase))
    setMode(m)
    setRound((r) => r + 1)
  }

  if (mode) {
    const meta = MODES.find((m) => m.id === mode)!
    return (
      <div className="flex min-h-full flex-col">
        <ViewHeader
          title={meta.title}
          subtitle={`${deck.length} items · ordered by what you find hardest`}
          action={
            <button
              type="button"
              onClick={() => setMode(null)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> All modes
            </button>
          }
        />
        <div className="flex flex-1 items-start justify-center px-8 py-8">
          {mode === 'flashcards' && <Flashcards key={round} deck={deck} onRestart={() => start('flashcards')} />}
          {mode === 'matching' && <Matching key={round} deck={deck} onRestart={() => start('matching')} />}
          {mode === 'fill' && <FillBlank key={round} deck={deck} onRestart={() => start('fill')} />}
        </div>
      </div>
    )
  }

  const focus = weakest(2).map((w) => w.phrase.term)
  const minWords = (m: Mode) => (m === 'matching' ? 3 : 2)

  return (
    <div>
      <ViewHeader title="Practice" subtitle="Short, fun rounds built from the things you actually read and watch." />
      <div className="px-8 py-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm">
          <Sparkles className="size-4 shrink-0 text-brand-foreground" />
          <p className="text-brand-foreground">
            {vocab.length < 2 ? (
              <>Save a few words from your screen first. Rounds are built from your own deck.</>
            ) : (
              <>
                Adaptive mode is on — every round leads with <strong className="font-semibold">{focus.join(' and ')}</strong> until they stick.
              </>
            )}
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MODES.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={vocab.length < minWords(m.id)}
                title={vocab.length < minWords(m.id) ? `Needs at least ${minWords(m.id)} saved words` : undefined}
                onClick={() => start(m.id)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
              >
                <div className={`flex h-32 items-center justify-center bg-gradient-to-b ${m.tint}`}>
                  <m.icon className="size-9 transition-transform group-hover:scale-110" />
                </div>
                <div className="p-4">
                  <p className="font-semibold">{m.title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function RoundComplete({ correct, total, onRestart }: { correct: number; total: number; onRestart: () => void }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-card p-10 text-center animate-in fade-in zoom-in-95">
      <div className="flex size-16 items-center justify-center rounded-full bg-brand-soft">
        <Sparkles className="size-7 text-brand-foreground" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">Round complete</h2>
      <p className="mt-1 text-muted-foreground">
        {correct} of {total} on the first try. Your deck has been re-prioritized.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Play again
      </button>
    </div>
  )
}
