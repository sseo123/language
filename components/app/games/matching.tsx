'use client'

import { useState } from 'react'
import { tr, type Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { RoundComplete, shuffle } from '../practice-view'

type Tile = { key: string; id: string; side: 'term' | 'meaning'; label: string }

export function Matching({ deck, onRestart }: { deck: Phrase[]; onRestart: () => void }) {
  const { recordAnswer, settings } = useStore()
  const lang = settings.comfortLang
  const [terms] = useState<Tile[]>(() => shuffle(deck.map((p) => ({ key: `t-${p.id}`, id: p.id, side: 'term', label: p.term }))))
  const [meanings] = useState<Tile[]>(() =>
    shuffle(deck.map((p) => ({ key: `m-${p.id}`, id: p.id, side: 'meaning', label: tr(p.shortMeaning, lang) }))),
  )
  const [picked, setPicked] = useState<Tile | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string[]>([])
  const [missed, setMissed] = useState<Set<string>>(new Set())

  if (matched.size === deck.length) {
    return <RoundComplete correct={deck.length - missed.size} total={deck.length} onRestart={onRestart} />
  }

  const pick = (tile: Tile) => {
    if (matched.has(tile.id)) return
    if (!picked || picked.side === tile.side) {
      setPicked(tile)
      return
    }
    if (picked.id === tile.id) {
      recordAnswer(tile.id, !missed.has(tile.id))
      setMatched((m) => new Set(m).add(tile.id))
    } else {
      setWrong([picked.key, tile.key])
      setMissed((m) => new Set(m).add(picked.id).add(tile.id))
      setTimeout(() => setWrong([]), 450)
    }
    setPicked(null)
  }

  const renderTile = (t: Tile) => {
    const done = matched.has(t.id)
    return (
      <button
        key={t.key}
        type="button"
        disabled={done}
        onClick={() => pick(t)}
        className={cn(
          'flex min-h-16 items-center justify-center rounded-xl border px-4 py-3 text-center transition-all duration-300',
          t.side === 'term' ? 'text-lg font-semibold' : 'text-[14px] leading-snug',
          done && 'scale-95 border-brand/40 bg-brand-soft text-brand-foreground opacity-60',
          !done && picked?.key === t.key && 'border-foreground bg-foreground text-background shadow-lg',
          !done && picked?.key !== t.key && 'border-border bg-card hover:-translate-y-0.5 hover:shadow-md',
          wrong.includes(t.key) && 'animate-shake border-destructive bg-destructive/10 text-destructive',
        )}
      >
        {t.label}
      </button>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-5 text-center text-sm text-muted-foreground">
        Tap a phrase, then its meaning. <span className="tabular-nums">{matched.size}/{deck.length}</span> matched
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">{terms.map(renderTile)}</div>
        <div className="flex flex-col gap-3">{meanings.map(renderTile)}</div>
      </div>
    </div>
  )
}
