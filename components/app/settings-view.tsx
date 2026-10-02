'use client'

import { LANGUAGES, type LangCode } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd } from '../brand'
import { ViewHeader } from './app-window'

export function SettingsView() {
  const { settings, updateSettings } = useStore()

  const setComfort = (code: LangCode) =>
    updateSettings({
      comfortLang: code,
      speakLangs: Array.from(new Set([code, ...settings.speakLangs])),
      learningLang: settings.learningLang === code ? (code === 'ko' ? 'en' : 'ko') : settings.learningLang,
    })

  const toggleSpeak = (code: LangCode) => {
    if (code === settings.comfortLang) return
    updateSettings({
      speakLangs: settings.speakLangs.includes(code) ? settings.speakLangs.filter((c) => c !== code) : [...settings.speakLangs, code],
    })
  }

  return (
    <div>
      <ViewHeader title="Settings" subtitle="Changes apply immediately to the overlay." />
      <div className="flex max-w-2xl flex-col gap-8 px-8 py-6">
        <Group title="Explanation language" desc="Gemma explains meaning, nuance, and follow-ups in this language.">
          <Segmented options={LANGUAGES.map((l) => ({ value: l.code, label: l.native }))} value={settings.comfortLang} onChange={setComfort} />
        </Group>
        <Group title="Languages you speak in" desc="Voice questions are recognized in any of these.">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = settings.speakLangs.includes(l.code)
              return (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSpeak(l.code)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    l.code === settings.comfortLang && 'cursor-default',
                  )}
                >
                  {l.native}
                </button>
              )
            })}
          </div>
        </Group>
        <Group title="Learning" desc="Tunes slang detection and quiz generation.">
          <Segmented
            options={LANGUAGES.filter((l) => l.code !== settings.comfortLang).map((l) => ({ value: l.code, label: l.native }))}
            value={settings.learningLang}
            onChange={(v) => updateSettings({ learningLang: v })}
          />
        </Group>
        <Group title="Shortcut & model">
          <dl className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <dt>Capture & ask</dt>
              <dd className="flex gap-1">
                <Kbd>⌥</Kbd>
                <Kbd>Space</Kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt>Model</dt>
              <dd className="text-muted-foreground">Gemma 4 · multimodal</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt>Save screenshots with words</dt>
              <dd className="text-muted-foreground">On</dd>
            </div>
          </dl>
        </Group>
      </div>
    </div>
  )
}

function Group({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-[13px] text-muted-foreground">{desc}</p>}
      {!desc && <div className="mb-3" />}
      {children}
    </section>
  )
}

function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-secondary p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
