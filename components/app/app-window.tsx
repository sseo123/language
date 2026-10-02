'use client'

import { BookOpen, Brain, Home, Settings } from 'lucide-react'
import { useStore, type AppView } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd, LumenAppIcon } from '../brand'
import { PracticeView } from './practice-view'
import { SettingsView } from './settings-view'
import { TodayView } from './today-view'
import { VocabularyView } from './vocabulary-view'

const NAV: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function AppWindow() {
  const { appView, setAppView, closeApp, vocab } = useStore()

  return (
    <section
      aria-label="Lumen"
      className="absolute inset-x-4 bottom-24 top-11 z-20 mx-auto flex max-w-[1100px] overflow-hidden rounded-xl border border-black/20 bg-background shadow-[0_40px_100px_-10px_rgb(0_0_0/0.55)] animate-in fade-in zoom-in-95 duration-300"
    >
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl">
        <div className="flex h-12 items-center gap-2 px-4">
          <button type="button" onClick={closeApp} aria-label="Close Lumen" className="size-3 rounded-full bg-[#ff5f57] hover:brightness-90" />
          <button type="button" onClick={closeApp} aria-label="Minimize Lumen" className="size-3 rounded-full bg-[#febc2e] hover:brightness-90" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2.5 px-4 pb-4 pt-1">
          <LumenAppIcon className="size-7" />
          <span className="font-semibold tracking-tight">Lumen</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Lumen sections">
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
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[12px] font-medium">Capture from anywhere</p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">Select any text or image on screen and ask out loud.</p>
            <div className="mt-2.5 flex gap-1">
              <Kbd>⌥</Kbd>
              <Kbd>Space</Kbd>
            </div>
          </div>
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
    <header className="sticky top-0 z-10 flex items-end justify-between gap-4 border-b border-border bg-background/85 px-8 pb-4 pt-6 backdrop-blur-xl">
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
