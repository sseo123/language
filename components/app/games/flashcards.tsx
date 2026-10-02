'use client'

import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { tr, type Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ContextCard } from '../context-card'
import { RoundComplete } from '../practice-view'

export function Flashcards({ deck, onRestart }: { deck: Phrase[]; onRestart: () => void }) {
  const { recordAnswer, settings } = useStore()
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)
  const lang = settings.comfortLang

  if (i >= deck.length) return <RoundComplete correct={correct} total={deck.length} onRestart={onRestart} />
  const card = deck[i]

  const answer = (ok: boolean) => {
    recordAnswer(card.id, ok)
    if (ok) setCorrect((c) => c + 1)
    setFlipped(false)
    setTimeout(() => setI((n) => n + 1), 180)
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      <div className="mb-5 flex w-full items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${(i / deck.length) * 100}%` }} />
        </div>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {i + 1}/{deck.length}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show front' : 'Flip card'}
        className="perspective-1000 h-[340px] w-full"
      >
        <div className={cn('preserve-3d relative size-full transition-transform duration-500', flipped && 'rotate-y-180')}>
          <div className="backface-hidden absolute inset-0 flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <ContextCard phrase={card} className="w-full" />
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="text-4xl font-semibold tracking-tight">{card.term}</p>
              {card.reading && <p className="mt-1 font-mono text-sm text-muted-foreground">{card.reading}</p>}
            </div>
            <p className="text-center text-[12px] text-muted-foreground">Click to reveal meaning</p>
          </div>
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-center rounded-2xl bg-[#11161d] p-8 text-left text-white shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{card.term}</p>
            <p className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-balance">{tr(card.shortMeaning, lang)}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/65">{tr(card.contextMeaning, lang)}</p>
            {card.examples[0] && (
              <p className="mt-5 border-l-2 border-brand/60 pl-3 text-sm">
                {card.examples[0].text}
                <span className="block text-white/50">{tr(card.examples[0].gloss, lang)}</span>
              </p>
            )}
          </div>
        </div>
      </button>

      <div className={cn('mt-6 grid w-full grid-cols-2 gap-3 transition-opacity', flipped ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <button
          type="button"
          onClick={() => answer(false)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary"
        >
          <RotateCcw className="size-4 text-amber-500" /> Still learning
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Check className="size-4 text-brand" /> Got it
        </button>
      </div>
    </div>
  )
}
