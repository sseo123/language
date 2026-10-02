import { ArrowRight, Flame, Target, TrendingDown } from 'lucide-react'
import { tr } from '@/lib/content'
import { formatSaved, useStore } from '@/lib/store'
import { api } from '@/lib/tauri'
import { Kbd } from '../brand'
import { ContextCard } from './context-card'
import { hotkeyParts } from './settings-view'
import { MasteryBar, ViewHeader } from './app-window'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function TodayView() {
  const { vocab, weakest, setAppView, settings, streak, longestStreak } = useStore()
  const due = vocab.filter((v) => v.mastery < 0.8).length
  const avg = vocab.length ? vocab.reduce((s, v) => s + v.mastery, 0) / vocab.length : 0
  const weak = weakest(3)
  const recent = vocab.slice(0, 3)
  const hotkey = hotkeyParts(settings.hotkey)

  if (vocab.length === 0) {
    return (
      <div>
        <ViewHeader title={greeting()} subtitle="Your deck fills up from whatever you read and watch." />
        <div className="px-8 py-6">
          <div className="flex flex-col items-start gap-5 rounded-2xl bg-[#11161d] p-8 text-white">
            <p className="text-[12px] font-medium uppercase tracking-wider text-brand">Capture your first word</p>
            <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-balance">
              Press{' '}
              <span className="inline-flex gap-1 align-middle">
                {hotkey.map((k, i) => (
                  <Kbd key={`${k}${i}`} dark>
                    {k}
                  </Kbd>
                ))}
              </span>{' '}
              over anything you don&apos;t understand, drag a box around it, and ask.
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-white/60">
              A subtitle, a comment, a meme, a chat message. Teachya reads the text in your selection, explains it in{' '}
              {settings.comfortLang === 'ko' ? '한국어' : 'your language'}, and saves it here with the original screenshot.
            </p>
            <button
              type="button"
              onClick={() => void api.startCapture()}
              className="flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:brightness-110"
            >
              Capture now <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ViewHeader title={greeting()} subtitle="Everything you looked up recently, ready to review." />
      <div className="flex flex-col gap-8 px-8 py-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat icon={Flame} label="Day streak" value={String(streak)} foot={`Longest: ${longestStreak} days`} />
          <Stat icon={Target} label="Due for review" value={String(due)} foot={`${vocab.length} words in your deck`} />
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[13px] text-muted-foreground">Average mastery</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{Math.round(avg * 100)}%</p>
            <MasteryBar value={avg} className="mt-3" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 rounded-2xl bg-[#11161d] p-6 text-white">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-brand">Today&apos;s session</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{due} words, built around what you miss most</h2>
            <p className="mt-1 text-sm text-white/60">
              Starting with {weak.map((w) => w.phrase.term).slice(0, 2).join(' and ')} — you&apos;ve stumbled on these recently.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAppView('practice')}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:brightness-110"
          >
            Start practice <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="size-4 text-amber-500" /> Focus areas
            </h2>
            <p className="mb-3 text-[13px] text-muted-foreground">Teachya adapts quizzes to these.</p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
              {weak.map((w) => (
                <li key={w.phrase.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{w.phrase.term}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{tr(w.phrase.shortMeaning, settings.comfortLang)}</p>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-[12px] tabular-nums text-muted-foreground">
                      {w.misses}/{w.attempts} missed
                    </p>
                    <MasteryBar value={w.mastery} className="mt-1.5" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Recently captured</h2>
            <p className="mb-3 text-[13px] text-muted-foreground">Saved with the original screen context.</p>
            <ul className="grid grid-cols-3 gap-3">
              {recent.map((v) => (
                <li key={v.phrase.id}>
                  <button type="button" onClick={() => setAppView('vocabulary')} className="w-full text-left">
                    <ContextCard phrase={v.phrase} />
                    <p className="mt-2 text-sm font-medium">{v.phrase.term}</p>
                    <p className="text-[12px] text-muted-foreground">{formatSaved(v.savedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, foot }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; foot: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{foot}</p>
    </div>
  )
}
