'use client'

import { useEffect, useRef, useState } from 'react'
import { BookmarkCheck, BookmarkPlus, CornerDownRight, Mic, Sparkles, Volume2, X } from 'lucide-react'
import { langInfo, tr, UI, type LangCode, type Phrase } from '@/lib/content'
import { cn } from '@/lib/utils'
import { Kbd } from '../brand'
import type { Rect } from './capture-overlay'

const WIDTH = 420

export function ExplanationPanel({
  phrase,
  lang,
  question,
  rect,
  saved,
  onSave,
  onClose,
  onAskAgain,
}: {
  phrase: Phrase
  lang: LangCode
  question: string
  rect: Rect
  saved: boolean
  onSave: (from: DOMRect) => void
  onClose: () => void
  onAskAgain: () => void
}) {
  const [thread, setThread] = useState<{ idx: number; ready: boolean }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const maxH = Math.min(640, vh - 120)
  let left = rect.x + rect.w + 18
  if (left + WIDTH > vw - 12) left = rect.x - WIDTH - 18
  if (left < 12) left = vw - WIDTH - 12
  const top = Math.min(Math.max(40, rect.y), vh - maxH - 96)

  useEffect(() => {
    const pending = thread.findIndex((t) => !t.ready)
    if (pending === -1) return
    const id = setTimeout(() => setThread((th) => th.map((t, i) => (i === pending ? { ...t, ready: true } : t))), 750)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    return () => clearTimeout(id)
  }, [thread])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [thread])

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(phrase.term)
    u.lang = langInfo(phrase.lang).locale
    u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  const asked = new Set(thread.map((t) => t.idx))
  const remaining = phrase.followUps.map((f, i) => ({ f, i })).filter(({ i }) => !asked.has(i))
  const highlight = (text: string) => {
    const parts = text.split(phrase.term)
    return parts.flatMap((p, i) => (i === 0 ? [p] : [<mark key={i} className="rounded bg-brand/20 px-0.5 text-brand">{phrase.term}</mark>, p]))
  }

  return (
    <aside
      aria-label={`Explanation of ${phrase.term}`}
      className="fixed z-[60] flex flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1117]/70 text-white shadow-[0_30px_80px_-16px_rgb(0_0_0/0.65)] backdrop-blur-2xl backdrop-saturate-150 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-2 duration-300"
      style={{ left, top, width: WIDTH, maxHeight: maxH }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] text-white/55">
          <Sparkles className="size-3.5 text-brand" />
          Gemma 4 · {lang === 'ko' ? UI.explainedIn.ko : `Explained in ${langInfo(lang).english}`}
        </span>
        <div className="flex items-center gap-1.5">
          <Kbd dark>esc</Kbd>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-4 pt-4">
        <p className="flex items-start gap-2 text-[13px] text-white/50">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0" />
          <span className="italic">&ldquo;{question}&rdquo;</span>
        </p>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-semibold leading-none tracking-tight">{phrase.term}</h2>
            <p className="mt-2 text-[13px] text-white/50">
              {phrase.reading && <span className="font-mono">{phrase.reading} · </span>}
              {tr(phrase.partOfSpeech, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={speak}
            aria-label="Hear pronunciation"
            className="flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-white/80 hover:bg-white/15"
          >
            <Volume2 className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {phrase.tags.map((t) => (
            <span key={t.en} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70">
              {tr(t, lang)}
            </span>
          ))}
        </div>

        <Section label={tr(UI.definition, lang)}>
          <p className="text-[15px] leading-relaxed text-white/90">{tr(phrase.definition, lang)}</p>
        </Section>

        <Section label={tr(UI.context, lang)}>
          <div className="rounded-xl border border-brand/20 bg-brand/[0.07] p-3 text-[14px] leading-relaxed text-white/85">
            {tr(phrase.contextMeaning, lang)}
          </div>
        </Section>

        <Section label={tr(UI.tone, lang)}>
          <p className="text-[14px] leading-relaxed text-white/75">{tr(phrase.tone, lang)}</p>
        </Section>

        <Section label={tr(UI.examples, lang)}>
          <ul className="flex flex-col gap-2.5">
            {phrase.examples.map((ex) => (
              <li key={ex.text} className="border-l-2 border-white/10 pl-3">
                <p className="text-[14px] text-white">{highlight(ex.text)}</p>
                <p className="text-[13px] text-white/50">{tr(ex.gloss, lang)}</p>
              </li>
            ))}
          </ul>
        </Section>

        {thread.map(({ idx, ready }) => {
          const f = phrase.followUps[idx]
          return (
            <div key={idx} className="mt-5 animate-in fade-in slide-in-from-bottom-1">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-3 py-2 text-[13px]">{tr(f.q, lang)}</p>
              <div className="mt-2 text-[14px] leading-relaxed text-white/85">
                {ready ? (
                  <p className="animate-in fade-in">{tr(f.a, lang)}</p>
                ) : (
                  <span className="flex gap-1 py-2" aria-label="Thinking">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="size-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: `${d * 120}ms` }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {remaining.length > 0 && (
          <Section label={tr(UI.followUp, lang)}>
            <div className="flex flex-col gap-1.5">
              {remaining.map(({ f, i }) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setThread((t) => [...t, { idx: i, ready: false }])}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-[13px] text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                >
                  {tr(f.q, lang)}
                  <CornerDownRight className="size-3.5 text-white/30 group-hover:text-brand" />
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.06] bg-black/20 p-3">
        <button
          ref={saveRef}
          type="button"
          disabled={saved}
          onClick={() => saveRef.current && onSave(saveRef.current.getBoundingClientRect())}
          className={cn(
            'flex h-9 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all',
            saved ? 'bg-white/[0.06] text-brand' : 'bg-brand text-brand-foreground hover:brightness-110 active:scale-[0.98]',
          )}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
          {tr(saved ? UI.saved : UI.save, lang)}
        </button>
        <button
          type="button"
          onClick={onAskAgain}
          className="flex h-9 items-center gap-2 rounded-xl bg-white/[0.08] px-3.5 text-[13px] font-medium text-white/85 hover:bg-white/15"
        >
          <Mic className="size-4" />
          {tr(UI.askAgain, lang)}
        </button>
      </div>
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">{label}</h3>
      {children}
    </section>
  )
}
