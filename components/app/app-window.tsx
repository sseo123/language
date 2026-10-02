import { useEffect } from 'react'
import { BookOpen, Brain, Home, Settings } from 'lucide-react'
import { useStore, type AppView } from '@/lib/store'
import { api, onEvent } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { Kbd, TeachyaAppIcon } from '../brand'
import { PracticeView } from './practice-view'
import { hotkeyParts, SettingsView } from './settings-view'
import { TodayView } from './today-view'
import { VocabularyView } from './vocabulary-view'

const NAV: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function AppWindow() {
  const { appView, setAppView, vocab, settings } = useStore()

  // The capture overlay can ask the main window to open a section (e.g. Settings for the API key).
  useEffect(() => onEvent<{ view: AppView }>('app:navigate', (p) => p?.view && setAppView(p.view)), [setAppView])

  return (
    <section aria-label="Teachya" className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl">
        {/* Native macOS traffic lights overlay this strip (titleBarStyle: Overlay). */}
        <div data-tauri-drag-region className="h-12 shrink-0" />
        <div data-tauri-drag-region className="flex items-center gap-2.5 px-4 pb-4 pt-1">
          <TeachyaAppIcon className="size-7" />
          <span className="font-semibold tracking-tight">Teachya</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Teachya sections">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setAppView(n.id)}
              aria-current={appView === n.id ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                appView === n.id ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              <n.icon className="size-4" />
              <span className="flex-1 text-left">{n.label}</span>
              {n.id === 'vocabulary' && <span className="text-xs tabular-nums text-muted-foreground">{vocab.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <button type="button" onClick={() => void api.startCapture()} className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/60">
            <p className="text-[12px] font-medium">Capture from anywhere</p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">Select any text or image on screen and ask.</p>
            <div className="mt-2.5 flex gap-1">
              {hotkeyParts(settings.hotkey).map((k, i) => (
                <Kbd key={`${k}${i}`}>{k}</Kbd>
              ))}
            </div>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {appView === 'today' && <TodayView />}
        {appView === 'vocabulary' && <VocabularyView />}
        {appView === 'practice' && <PracticeView />}
        {appView === 'settings' && <SettingsView />}
      </div>
    </section>
  )
}

export function ViewHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header data-tauri-drag-region className="sticky top-0 z-10 flex items-end justify-between gap-4 border-b border-border bg-background/85 px-8 pb-4 pt-6 backdrop-blur-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function MasteryBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-secondary', className)} role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Mastery">
      <div
        className={cn('h-full rounded-full transition-all duration-500', value < 0.4 ? 'bg-amber-400' : value < 0.8 ? 'bg-sky-400' : 'bg-brand')}
        style={{ width: `${Math.max(4, value * 100)}%` }}
      />
    </div>
  )
}
