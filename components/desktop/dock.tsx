'use client'

import { Compass, FolderClosed, MessageCircle, Music2, NotebookPen, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { LumenAppIcon } from '../brand'

const APPS = [
  { name: 'Finder', icon: FolderClosed, bg: 'bg-gradient-to-b from-[#6ab8ff] to-[#1f7ae0]', active: false },
  { name: 'Safari', icon: Compass, bg: 'bg-gradient-to-b from-[#f4f7fb] to-[#d9e2ee] text-[#1b78e8]', active: true },
  { name: 'Messages', icon: MessageCircle, bg: 'bg-gradient-to-b from-[#6ef08b] to-[#22b84a]', active: false },
  { name: 'Notes', icon: NotebookPen, bg: 'bg-gradient-to-b from-[#fff3b0] to-[#f7d54a] text-[#7a5b00]', active: false },
  { name: 'Music', icon: Music2, bg: 'bg-gradient-to-b from-[#ff6b81] to-[#f43f5e]', active: false },
]

export function Dock() {
  const { appOpen, openApp, dockPulse, vocab } = useStore()
  const newCount = vocab.filter((v) => v.savedLabel === 'Just now').length

  return (
    <nav aria-label="Dock" className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
      <ul className="pointer-events-auto flex items-end gap-2 rounded-[22px] border border-white/25 bg-white/20 px-2.5 pb-2 pt-2 shadow-[0_10px_40px_rgb(0_0_0/0.25)] backdrop-blur-2xl">
        {APPS.map((a) => (
          <li key={a.name} className="group relative flex flex-col items-center">
            <DockTooltip label={a.name} />
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-[12px] text-white shadow-md transition-transform group-hover:-translate-y-1',
                a.bg,
              )}
              aria-label={a.name}
            >
              <a.icon className="size-6" strokeWidth={1.75} />
            </div>
            <span className={cn('mt-1 size-1 rounded-full', a.active ? 'bg-white/80' : 'bg-transparent')} />
          </li>
        ))}
        <li className="mx-1 h-12 w-px self-center bg-white/30" aria-hidden="true" />
        <li className="group relative flex flex-col items-center">
          <DockTooltip label="Lumen" />
          <button
            id="lumen-dock"
            type="button"
            aria-label="Open Lumen"
            onClick={() => openApp()}
            className="relative transition-transform group-hover:-translate-y-1"
          >
            <span key={dockPulse} className={cn('block', dockPulse > 0 && 'animate-dock-bounce')}>
              <LumenAppIcon className="size-12" />
            </span>
            {dockPulse > 0 && <span key={`r${dockPulse}`} className="absolute inset-0 rounded-[12px] border-2 border-brand animate-ring-burst" />}
            {newCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[11px] font-semibold text-white shadow">
                {newCount}
              </span>
            )}
          </button>
          <span className={cn('mt-1 size-1 rounded-full', appOpen ? 'bg-white/80' : 'bg-transparent')} />
        </li>
        <li className="group relative flex flex-col items-center">
          <DockTooltip label="Trash" />
          <div className="flex size-12 items-center justify-center rounded-[12px] bg-white/30 text-white/90">
            <Trash2 className="size-6" strokeWidth={1.5} />
          </div>
          <span className="mt-1 size-1" />
        </li>
      </ul>
    </nav>
  )
}

function DockTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
      {label}
    </span>
  )
}
