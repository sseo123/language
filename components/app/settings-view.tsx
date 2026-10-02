import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Loader2, Mic, MonitorUp } from 'lucide-react'
import { LANGUAGES, type LangCode } from '@/lib/content'
import { DEFAULT_HOTKEY, useStore } from '@/lib/store'
import { api, isTauri, type ModelConfig, type Permissions } from '@/lib/tauri'
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
        <ModelGroup config={settings.model} onChange={(model) => updateSettings({ model })} />

        <Group title="Explanation language" desc="Teachya explains meaning, nuance, and follow-ups in this language.">
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
        <Group title="Learning" desc="Tunes text recognition, slang detection, and quiz generation.">
          <Segmented
            options={LANGUAGES.filter((l) => l.code !== settings.comfortLang).map((l) => ({ value: l.code, label: l.native }))}
            value={settings.learningLang}
            onChange={(v) => updateSettings({ learningLang: v })}
          />
        </Group>

        <Group title="Shortcut">
          <HotkeyRow value={settings.hotkey} onChange={(hotkey) => updateSettings({ hotkey })} />
        </Group>

        <Group title="Permissions" desc="Teachya only captures the region you select, and only listens while the overlay is open.">
          <PermissionsList />
        </Group>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ModelGroup({ config, onChange, compact }: { config: ModelConfig; onChange: (c: ModelConfig) => void; compact?: boolean }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    api.hasApiKey().then(setHasKey).catch(() => setHasKey(false))
  }, [])

  const saveKey = async () => {
    setSaving(true)
    try {
      await api.setApiKey(key)
      setHasKey(key.trim().length > 0)
      setKey('')
      setTest(null)
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    setTest(null)
    try {
      setTest(await api.testConnection(config))
    } finally {
      setTesting(false)
    }
  }

  const field = 'h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <Group
      title="Model"
      desc={compact ? undefined : 'Gemma or Gemini with a Google AI Studio key, or any OpenAI-compatible chat API. Your key is stored in the macOS Keychain and only ever read by the app itself.'}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-[1fr_180px] gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted-foreground">Base URL</span>
            <input value={config.baseUrl} onChange={(e) => onChange({ ...config, baseUrl: e.target.value })} placeholder="https://generativelanguage.googleapis.com/v1beta" className={field} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted-foreground">Model</span>
            <input value={config.model} onChange={(e) => onChange({ ...config, model: e.target.value })} placeholder="gemma-4-31b-it" className={field} spellCheck={false} />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            <span>API key</span>
            {hasKey && (
              <span className="flex items-center gap-1 text-brand-foreground">
                <Check className="size-3" /> Saved in Keychain
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && key && void saveKey()}
                placeholder={hasKey ? '•••••••••••• (enter a new key to replace)' : 'AIza…'}
                autoComplete="off"
                spellCheck={false}
                className={cn(field, 'pl-8 pr-9 font-mono')}
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide key' : 'Show key'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <button
              type="button"
              disabled={!key.trim() || saving || !isTauri}
              onClick={() => void saveKey()}
              className="h-9 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </button>
            {hasKey && (
              <button
                type="button"
                onClick={() => api.clearApiKey().then(() => setHasKey(false))}
                className="h-9 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Remove
              </button>
            )}
          </div>
        </label>

        {!compact && (
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted-foreground">Transcription model (voice questions)</span>
            <input value={config.transcribeModel} onChange={(e) => onChange({ ...config, transcribeModel: e.target.value })} placeholder="gemini-flash-latest" className={field} spellCheck={false} />
          </label>
        )}

        <label className="flex cursor-pointer items-center justify-between gap-4 pt-1">
          <span>
            <span className="block text-[13px] font-medium">Send the screenshot too</span>
            <span className="block text-[12px] text-muted-foreground">Better for memes and images. Turn off to send only the recognized text.</span>
          </span>
          <Switch checked={config.sendScreenshot} onChange={(sendScreenshot) => onChange({ ...config, sendScreenshot })} />
        </label>

        <div className="flex items-center gap-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => void runTest()}
            disabled={testing || !isTauri}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium hover:bg-secondary disabled:opacity-40"
          >
            {testing && <Loader2 className="size-3.5 animate-spin" />} Test connection
          </button>
          {test && <p className={cn('text-[12px]', test.ok ? 'text-brand-foreground' : 'text-destructive')}>{test.message}</p>}
        </div>
      </div>
    </Group>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-border')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )
}

// ---------------------------------------------------------------------------

const MOD_LABEL: Record<string, string> = { Alt: '⌥', Control: '⌃', Shift: '⇧', Super: '⌘' }

export function hotkeyParts(hotkey: string) {
  return hotkey.split('+').map((k) => MOD_LABEL[k] ?? k)
}

function keyFromEvent(e: KeyboardEvent | React.KeyboardEvent): string | null {
  const code = e.code
  if (code === 'Space') return 'Space'
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  const named: Record<string, string> = {
    Enter: 'Enter',
    Tab: 'Tab',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }
  return named[code] ?? null
}

function HotkeyRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    if (e.key === 'Escape') {
      setRecording(false)
      return
    }
    const key = keyFromEvent(e)
    if (!key) return
    const mods = [e.altKey && 'Alt', e.ctrlKey && 'Control', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean) as string[]
    if (mods.length === 0) {
      setError('Add at least one modifier (⌥ ⌃ ⇧ ⌘).')
      return
    }
    const next = [...mods, key].join('+')
    api
      .setHotkey(next)
      .then(() => {
        setError(null)
        onChange(next)
        setRecording(false)
      })
      .catch((err) => setError(String(err)))
  }

  return (
    <div className="rounded-xl border border-border bg-card text-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p>Capture &amp; ask</p>
          {error && <p className="mt-0.5 text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecording((r) => !r)}
            onKeyDown={onKeyDown}
            onBlur={() => setRecording(false)}
            className={cn(
              'flex h-8 min-w-[120px] items-center justify-center gap-1 rounded-lg border px-2 transition-colors',
              recording ? 'border-brand bg-brand-soft text-brand-foreground' : 'border-border hover:bg-secondary',
            )}
          >
            {recording ? (
              <span className="text-[12px]">Press keys…</span>
            ) : (
              hotkeyParts(value).map((k, i) => <Kbd key={`${k}${i}`}>{k}</Kbd>)
            )}
          </button>
          {value !== DEFAULT_HOTKEY && (
            <button type="button" onClick={() => api.setHotkey(DEFAULT_HOTKEY).then(() => onChange(DEFAULT_HOTKEY))} className="text-[12px] text-muted-foreground hover:text-foreground">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PermissionsList({ onChange }: { onChange?: (p: Permissions) => void } = {}) {
  const [perms, setPerms] = useState<Permissions | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = () =>
    api
      .checkPermissions()
      .then((p) => {
        setPerms(p)
        onChange?.(p)
      })
      .catch(() => {})

  useEffect(() => {
    void refresh()
    // Re-check when the user comes back from System Settings.
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const request = async (kind: 'screen' | 'mic') => {
    setBusy(kind)
    try {
      const p = await api.requestPermission(kind)
      setPerms(p)
      onChange?.(p)
      // macOS does not re-prompt once denied; take the user straight to the pane.
      if (!p[kind]) await api.openPrivacySettings(kind)
    } finally {
      setBusy(null)
    }
  }

  const rows = [
    { id: 'screen' as const, icon: MonitorUp, title: 'Screen Recording', desc: 'Capture only the region you select.' },
    { id: 'mic' as const, icon: Mic, title: 'Microphone', desc: 'Hear your question while the overlay is open. Optional.' },
  ]

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {rows.map((p) => {
        const granted = perms?.[p.id] === true
        return (
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
              disabled={granted || busy !== null || !isTauri}
              onClick={() => void request(p.id)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                granted ? 'bg-brand-soft text-brand-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
              )}
            >
              {busy === p.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : granted ? (
                <>
                  <Check className="size-3.5" /> Allowed
                </>
              ) : (
                'Allow'
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------

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
