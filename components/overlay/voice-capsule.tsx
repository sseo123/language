'use client'

import { Square } from 'lucide-react'
import { langInfo, type LangCode } from '@/lib/content'
import { cn } from '@/lib/utils'
import { Kbd, LumenMark } from '../brand'
import { VoiceWaveform } from '../voice-waveform'
import type { Rect } from './capture-overlay'

const WIDTH = 400

export function VoiceCapsule({
  rect,
  phase,
  transcript,
  speakLangs,
  detected,
  onStop,
}: {
  rect: Rect
  phase: 'listening' | 'thinking'
  transcript: string
  speakLangs: LangCode[]
  detected: LangCode
  onStop: () => void
}) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(Math.max(rect.x + rect.w / 2 - WIDTH / 2, 12), vw - WIDTH - 12)
  const below = rect.y + rect.h + 16
  const top = below + 170 < vh ? below : Math.max(40, rect.y - 186)

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1117]/80 text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)] backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-300"
      style={{ left, top, width: WIDTH }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <LumenMark className="size-3.5 text-brand" />
          {phase === 'listening' ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              Listening
            </span>
          ) : (
            <span className="text-shimmer font-medium">Gemma 4 is reading your selection…</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {speakLangs.map((l) => (
            <span
              key={l}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] transition-colors',
                l === detected ? 'bg-brand/20 text-brand' : 'bg-white/5 text-white/40',
              )}
            >
              {langInfo(l).native}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2">
        <VoiceWaveform mode={phase} height={64} />
      </div>

      <div className="flex items-end gap-3 px-4 pb-4">
        <p className={cn('min-h-[44px] flex-1 text-[15px] leading-snug', transcript ? 'text-white' : 'text-white/40')}>
          {transcript || 'Ask anything about what you selected…'}
          {phase === 'listening' && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white/70" />}
        </p>
        {phase === 'listening' && (
          <button
            type="button"
            onClick={onStop}
            aria-label="Done speaking"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
          >
            <Square className="size-3.5" fill="currentColor" />
          </button>
        )}
      </div>
      {phase === 'listening' && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 text-[11px] text-white/40">
          <span>Pause to send automatically</span>
          <span className="flex items-center gap-1">
            <Kbd dark>↵</Kbd> send <Kbd dark className="ml-1.5">esc</Kbd> cancel
          </span>
        </div>
      )}
    </div>
  )
}
