'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Keyboard, Mic, MonitorUp } from 'lucide-react'
import { LANGUAGES, langInfo, type LangCode } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd, LumenAppIcon, withGlyphs } from './brand'
import { VoiceWaveform } from './voice-waveform'

const STEPS = ['Welcome', 'Comfort', 'Voice', 'Learning', 'Permissions'] as const

export function Onboarding() {
  const { completeOnboarding } = useStore()
  const [step, setStep] = useState(0)
  const [comfort, setComfort] = useState<LangCode>('en')
  const [extraSpeak, setExtraSpeak] = useState<LangCode[]>(['en'])
  const [learning, setLearning] = useState<LangCode>('ko')
  const [micTest, setMicTest] = useState(false)
  const [granted, setGranted] = useState<Record<string, boolean>>({})

  const speakLangs = Array.from(new Set<LangCode>([comfort, ...extraSpeak]))
  const allGranted = ['screen', 'mic', 'access'].every((k) => granted[k])

  const pickComfort = (code: LangCode) => {
    setComfort(code)
    if (learning === code) setLearning(code === 'ko' ? 'en' : 'ko')
  }

  const finish = () => completeOnboarding({ comfortLang: comfort, speakLangs, learningLang: learning })

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/wallpaper.png)' }} />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-2xl" />

      <section
        aria-labelledby="onboarding-title"
        className="relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/85 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl"
      >
        <header className="flex h-11 items-center gap-2 border-b border-black/5 px-4">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="flex-1 text-center text-[13px] font-medium text-muted-foreground">Lumen Setup</span>
          <span className="w-[52px]" />
        </header>

        <div className="min-h-[440px] px-10 pb-6 pt-8">
          {step === 0 && (
            <div className="flex flex-col items-center pt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <LumenAppIcon className="size-20" />
              <h1 id="onboarding-title" className="mt-6 text-3xl font-semibold tracking-tight text-balance">
                Your screen is your curriculum.
              </h1>
              <p className="mt-3 max-w-md leading-relaxed text-muted-foreground text-pretty">
                Lumen lives in your menu bar. Select anything you don&apos;t understand — a subtitle, a post, a meme — and
                ask about it out loud. Gemma 4 explains the meaning, nuance, and culture in your language.
              </p>
              <ol className="mt-8 grid w-full grid-cols-3 gap-3 text-left">
                {[
                  { k: '⌥ Space', t: 'Summon anywhere' },
                  { k: 'Drag', t: 'Select any region' },
                  { k: 'Speak', t: 'Ask in your language' },
                ].map((s, i) => (
                  <li key={s.t} className="rounded-xl border border-border bg-card p-4">
                    <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                    <p className="mt-2 text-sm font-medium">{withGlyphs(s.k)}</p>
                    <p className="text-[13px] text-muted-foreground">{s.t}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 1 && (
            <StepShell
              title="Which language are you most comfortable in?"
              subtitle="Gemma will explain everything in this language — definitions, nuance, and follow-ups."
            >
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((l) => (
                  <LangTile key={l.code} active={comfort === l.code} onClick={() => pickComfort(l.code)} native={l.native} english={l.english} />
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="How will you ask questions?"
              subtitle={`Gemma will listen for ${speakLangs.map((c) => langInfo(c).native).join(' or ')}. Mix them freely — even mid-sentence.`}
            >
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((l) => {
                  const locked = l.code === comfort
                  const active = locked || extraSpeak.includes(l.code)
                  return (
                    <LangTile
                      key={l.code}
                      active={active}
                      locked={locked}
                      native={l.native}
                      english={locked ? 'Primary' : l.english}
                      onClick={() =>
                        !locked &&
                        setExtraSpeak((prev) => (prev.includes(l.code) ? prev.filter((c) => c !== l.code) : [...prev, l.code]))
                      }
                    />
                  )
                })}
              </div>
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-[#11161d] p-3 pl-4">
                <button
                  type="button"
                  onClick={() => setMicTest((v) => !v)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                    micTest ? 'bg-brand text-brand-foreground' : 'bg-white/10 text-white hover:bg-white/15',
                  )}
                >
                  <Mic className="size-3.5" />
                  {micTest ? 'Stop test' : 'Test microphone'}
                </button>
                <div className="h-10 flex-1">
                  {micTest ? (
                    <VoiceWaveform mode="listening" height={40} />
                  ) : (
                    <p className="flex h-full items-center text-[13px] text-white/50">Say something to see Lumen hear you.</p>
                  )}
                </div>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="What are you learning?" subtitle="Lumen tunes slang detection, romanization, and quizzes to this language.">
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.filter((l) => l.code !== comfort).map((l) => (
                  <LangTile key={l.code} active={learning === l.code} onClick={() => setLearning(l.code)} native={l.native} english={l.english} />
                ))}
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Let Lumen see and hear" subtitle="Everything stays on your Mac until you ask a question.">
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {[
                  { id: 'screen', icon: MonitorUp, title: 'Screen Recording', desc: 'Capture only the region you select.' },
                  { id: 'mic', icon: Mic, title: 'Microphone', desc: 'Hear your question while the overlay is open.' },
                  { id: 'access', icon: Keyboard, title: 'Accessibility', desc: 'Listen for the global shortcut.' },
                ].map((p) => (
                  <li key={p.id} className="flex items-center gap-4 p-4">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                      <p.icon className="size-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-[13px] text-muted-foreground">{p.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGranted((g) => ({ ...g, [p.id]: true }))}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                        granted[p.id] ? 'bg-brand-soft text-brand-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {granted[p.id] ? (
                        <>
                          <Check className="size-3.5" /> Allowed
                        </>
                      ) : (
                        'Allow'
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                <span className="text-sm">Global shortcut</span>
                <span className="flex items-center gap-1">
                  <Kbd>⌥ Option</Kbd>
                  <Kbd>Space</Kbd>
                </span>
              </div>
            </StepShell>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-black/5 px-6 py-4">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span key={s} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground/15')} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {step === 0 ? 'Get started' : 'Continue'} <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={!allGranted}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Start using Lumen <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <h2 className="text-2xl font-semibold tracking-tight text-balance">{title}</h2>
      <p className="mb-6 mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">{subtitle}</p>
      {children}
    </div>
  )
}

function LangTile({
  active,
  locked,
  native,
  english,
  onClick,
}: {
  active: boolean
  locked?: boolean
  native: string
  english: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start rounded-xl border p-4 text-left transition-all',
        active ? 'border-foreground bg-card shadow-[0_0_0_1px_var(--foreground)]' : 'border-border bg-card/60 hover:border-foreground/30',
        locked && 'cursor-default',
      )}
    >
      <span className="text-lg font-semibold">{native}</span>
      <span className="text-[13px] text-muted-foreground">{english}</span>
      {active && (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
