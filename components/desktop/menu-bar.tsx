'use client'

import { useEffect, useRef, useState } from 'react'
import { BatteryMedium, BookOpen, Brain, Crosshair, Search, Settings, Wifi } from 'lucide-react'
import { langInfo } from '@/lib/content'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd, LumenMark } from '../brand'

function Clock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  if (!now) return <span className="w-28" />
  return (
    <span className="tabular-nums">
      {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </span>
  )
}

export function MenuBar({ onCapture }: { onCapture: () => void }) {
  const { settings, vocab, openApp, dockPulse } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const due = vocab.filter((v) => v.mastery < 0.8).length

  return (
    <header className="relative z-40 flex h-7 items-center justify-between bg-black/25 px-4 text-[13px] text-white backdrop-blur-2xl">
      <nav className="flex items-center gap-5" aria-label="Application menu">
        <svg viewBox="0 0 17 20" className="h-3.5 fill-white" aria-label="Apple menu" role="img">
          <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.3c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-4.2zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3.1-1.5z" />
        </svg>
        <span className="font-semibold">Safari</span>
        {['File', 'Edit', 'View', 'History', 'Bookmarks', 'Window', 'Help'].map((m) => (
          <span key={m} className="hidden text-white/90 lg:inline">
            {m}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <div ref={ref} className="relative">
          <button
            id="lumen-tray"
            type="button"
            aria-label="Lumen menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn('relative flex h-5 items-center rounded px-1.5 transition-colors', open ? 'bg-white/25' : 'hover:bg-white/15')}
          >
            <LumenMark className="size-3.5" />
            {dockPulse > 0 && <span key={dockPulse} className="absolute inset-0 rounded bg-brand/70 animate-ring-burst" />}
          </button>
          {open && (
            <div className="absolute right-0 top-7 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#1c2028]/85 p-1.5 text-white shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 pb-2 pt-1.5">
                <p className="text-[13px] font-semibold">Lumen</p>
                <p className="text-xs text-white/50">
                  Explaining in {langInfo(settings.comfortLang).native} · Model: Gemma 4
                </p>
              </div>
              <div className="my-1 h-px bg-white/10" />
              <TrayItem
                icon={Crosshair}
                label="Capture & ask"
                hint={
                  <span className="flex gap-1">
                    <Kbd dark>⌥</Kbd>
                    <Kbd dark>Space</Kbd>
                  </span>
                }
                onClick={() => {
                  setOpen(false)
                  onCapture()
                }}
              />
              <TrayItem
                icon={Brain}
                label="Practice now"
                hint={<span className="text-xs text-white/50">{due} due</span>}
                onClick={() => {
                  setOpen(false)
                  openApp('practice')
                }}
              />
              <TrayItem
                icon={BookOpen}
                label="Open vocabulary"
                hint={<span className="text-xs text-white/50">{vocab.length}</span>}
                onClick={() => {
                  setOpen(false)
                  openApp('vocabulary')
                }}
              />
              <div className="my-1 h-px bg-white/10" />
              <TrayItem
                icon={Settings}
                label="Settings…"
                onClick={() => {
                  setOpen(false)
                  openApp('settings')
                }}
              />
            </div>
          )}
        </div>
        <BatteryMedium className="size-4" aria-hidden="true" />
        <Wifi className="size-3.5" aria-hidden="true" />
        <Search className="size-3.5" aria-hidden="true" />
        <Clock />
      </div>
    </header>
  )
}

function TrayItem({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-white/10"
    >
      <Icon className="size-3.5 text-white/70" />
      <span className="flex-1">{label}</span>
      {hint}
    </button>
  )
}
