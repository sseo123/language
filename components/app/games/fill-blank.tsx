import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { tr, type Phrase } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { RoundComplete, shuffle } from '../practice-view'

/** Distractors come from the rest of the learner's deck, same language first. */
function buildOptions(p: Phrase, all: Phrase[]) {
  const others = all.filter((o) => o.id !== p.id && o.cloze.answer !== p.cloze.answer)
  const sameLang = others.filter((o) => o.lang === p.lang)
  const rest = others.filter((o) => o.lang !== p.lang)
  const pool = [...shuffle(sameLang), ...shuffle(rest)].map((o) => o.cloze.answer)
  const unique = [...new Set(pool)].slice(0, 3)
  return shuffle([p.cloze.answer, ...unique])
}

export function FillBlank({ deck, onRestart }: { deck: Phrase[]; onRestart: () => void }) {
  const { recordAnswer, settings, vocab } = useStore()
  const [questions] = useState(() => {
    const all = vocab.map((v) => v.phrase)
    return deck.filter((p) => p.cloze.sentence.includes('___')).map((p) => ({ phrase: p, options: buildOptions(p, all) }))
  })
  const [i, setI] = useState(0)
  const [choice, setChoice] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)

  if (i >= questions.length) return <RoundComplete correct={correct} total={questions.length} onRestart={onRestart} />
  const { phrase, options } = questions[i]
  const [before, after] = phrase.cloze.sentence.split('___')
  const isRight = choice === phrase.cloze.answer

  const choose = (opt: string) => {
    if (choice) return
    setChoice(opt)
    const ok = opt === phrase.cloze.answer
    recordAnswer(phrase.id, ok)
    if (ok) setCorrect((c) => c + 1)
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {i + 1}/{questions.length}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-[12px] font-medium text-muted-foreground">
          From {phrase.source.app}
          {phrase.source.handle ? ` · ${phrase.source.handle}` : ''}
        </p>
        <p className="mt-4 text-2xl font-medium leading-relaxed tracking-tight">
          {before}
          <span
            className={cn(
              'mx-1 inline-flex min-w-24 items-center justify-center rounded-lg border-2 border-dashed px-3 py-0.5 align-baseline transition-all',
              !choice && 'border-border text-transparent',
              choice && isRight && 'border-solid border-brand bg-brand-soft text-brand-foreground',
              choice && !isRight && 'animate-shake border-solid border-destructive bg-destructive/10 text-destructive',
            )}
          >
            {choice ?? '____'}
          </span>
          {after}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Hint: {tr(phrase.shortMeaning, settings.comfortLang)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isAnswer = opt === phrase.cloze.answer
          return (
            <button
              key={opt}
              type="button"
              disabled={!!choice}
              onClick={() => choose(opt)}
              className={cn(
                'h-12 rounded-xl border text-[15px] font-medium transition-all',
                !choice && 'border-border bg-card hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-md',
                choice && isAnswer && 'border-brand bg-brand-soft text-brand-foreground',
                choice && !isAnswer && opt === choice && 'border-destructive/50 bg-destructive/5 text-destructive',
                choice && !isAnswer && opt !== choice && 'border-border bg-card opacity-40',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {choice && (
        <div className="mt-5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
          <p className={cn('text-sm font-medium', isRight ? 'text-emerald-700' : 'text-destructive')}>
            {isRight ? 'Nice — exactly right.' : `It was “${phrase.cloze.answer}”. We’ll bring this one back soon.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setChoice(null)
              setI((n) => n + 1)
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Next <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
