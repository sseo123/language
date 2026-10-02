import { useEffect, useRef } from 'react'
import { ArrowUp, Mic, Square } from 'lucide-react'
import { langInfo, type LangCode } from '@/lib/content'
import type { MicState } from '@/lib/voice'
import { cn } from '@/lib/utils'
import { Kbd, TeachyaMark } from '../brand'
import { VoiceWaveform } from '../voice-waveform'
import type { Rect } from './capture-overlay'

const WIDTH = 400

export function VoiceCapsule({
  rect,
  phase,
  value,
  onChange,
  onSubmit,
  speakLangs,
  detected,
  mic,
  onToggleMic,
  status,
}: {
  rect: Rect
  phase: 'listening' | 'thinking'
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  speakLangs: LangCode[]
  detected: LangCode
  mic: MicState
  onToggleMic: () => void
  /** Secondary status line, e.g. while text is still being recognized. */
  status?: string
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(Math.max(rect.x + rect.w / 2 - WIDTH / 2, 12), vw - WIDTH - 12)
  const below = rect.y + rect.h + 16
  const top = below + 190 < vh ? below : Math.max(40, rect.y - 206)

  useEffect(() => {
    if (phase === 'listening') inputRef.current?.focus()
  }, [phase])

  // Auto-grow the question field up to three lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`
  }, [value])

  const recording = mic === 'recording'
  const busy = phase === 'thinking' || mic === 'transcribing'
  const waveMode = phase === 'thinking' ? 'thinking' : recording ? 'listening' : 'idle'

  return (
    <div
      role="dialog"
      aria-label="Ask about your selection"
      className="fixed z-[60] overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1117]/80 text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)] backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-300"
      style={{ left, top, width: WIDTH }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <TeachyaMark className="size-3.5 text-brand" />
          {phase === 'thinking' ? (
            <span className="text-shimmer font-medium">Teachya is reading your selection…</span>
          ) : mic === 'transcribing' ? (
            <span className="text-shimmer font-medium">Transcribing…</span>
          ) : recording ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              Listening
            </span>
          ) : (
            <span>{status ?? 'Ask about your selection'}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {speakLangs.map((l) => (
            <span
              key={l}
              className={cn('rounded-full px-2 py-0.5 text-[11px] transition-colors', l === detected ? 'bg-brand/20 text-brand' : 'bg-white/5 text-white/40')}
            >
              {langInfo(l).native}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2">
        <VoiceWaveform mode={waveMode} height={56} />
      </div>

      <div className="flex items-end gap-2 px-3 pb-3">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (!busy) onSubmit()
            }
          }}
          rows={1}
          disabled={busy}
          placeholder={recording ? 'Speak now…' : 'Ask anything about what you selected…'}
          className="scrollbar-thin min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-snug text-white outline-none placeholder:text-white/40 disabled:opacity-60"
        />
        {phase === 'listening' && (
          <>
            <button
              type="button"
              onClick={onToggleMic}
              disabled={busy || mic === 'unavailable'}
              aria-pressed={recording}
              aria-label={recording ? 'Stop recording' : 'Ask by voice'}
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40',
                recording ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-white/10 text-white/80 hover:bg-white/15',
              )}
            >
              {recording ? <Square className="size-3.5" fill="currentColor" /> : <Mic className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              aria-label="Send"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-40"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {phase === 'listening' && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 text-[11px] text-white/40">
          <span>{recording ? 'Stop to send what you said' : 'Leave empty to just ask what it means'}</span>
          <span className="flex items-center gap-1">
            <Kbd dark>↵</Kbd> send <Kbd dark className="ml-1.5">esc</Kbd> cancel
          </span>
        </div>
      )}
    </div>
  )
}
