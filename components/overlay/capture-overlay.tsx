import { useRef, useState } from 'react'
import { Kbd } from '../brand'

export type Rect = { x: number; y: number; w: number; h: number }
export type CapturePhase = 'selecting' | 'listening' | 'thinking' | 'answer'

const normalize = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
})

export function CaptureOverlay({
  phase,
  rect,
  onSelected,
  onDismiss,
}: {
  phase: CapturePhase
  rect: Rect | null
  onSelected: (r: Rect) => void
  onDismiss: () => void
}) {
  const origin = useRef<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  if (phase === 'selecting') {
    return (
      <div
        className="fixed inset-0 z-50 cursor-crosshair select-none touch-none"
        role="application"
        aria-label="Drag to select a region of the screen. Press Escape to cancel."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          origin.current = { x: e.clientX, y: e.clientY }
          setDraft({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
        }}
        onPointerMove={(e) => {
          setCursor({ x: e.clientX, y: e.clientY })
          if (origin.current) setDraft(normalize(origin.current, { x: e.clientX, y: e.clientY }))
        }}
        onPointerUp={(e) => {
          const start = origin.current
          origin.current = null
          if (!start) return
          const r = normalize(start, { x: e.clientX, y: e.clientY })
          setDraft(null)
          if (r.w < 12 || r.h < 12) return
          onSelected(r)
        }}
      >
        {draft && draft.w > 0 ? (
          <Cutout rect={draft} dim={0.5}>
            <span className="absolute -bottom-7 right-0 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white tabular-nums">
              {Math.round(draft.w)} × {Math.round(draft.h)}
            </span>
          </Cutout>
        ) : (
          <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" />
        )}

        {cursor && !draft && (
          <span
            className="pointer-events-none absolute rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white tabular-nums"
            style={{ left: cursor.x + 14, top: cursor.y + 14 }}
          >
            {Math.round(cursor.x)}, {Math.round(cursor.y)}
          </span>
        )}

        <div className="pointer-events-none absolute left-1/2 top-12 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[13px] text-white shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <span className="size-1.5 rounded-full bg-brand" />
          Drag over anything you want explained
          <span className="flex items-center gap-1 text-white/60">
            <Kbd dark>esc</Kbd> to cancel
          </span>
        </div>
      </div>
    )
  }

  if (!rect) return null

  if (phase === 'answer') {
    return (
      <div className="fixed inset-0 z-50" onPointerDown={onDismiss}>
        <svg className="pointer-events-none absolute" style={{ left: rect.x - 3, top: rect.y - 3 }} width={rect.w + 6} height={rect.h + 6} aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            width={rect.w + 3}
            height={rect.h + 3}
            rx="8"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="animate-marching"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50" onPointerDown={onDismiss}>
      <Cutout rect={rect} dim={0.42} glow />
    </div>
  )
}

function Cutout({ rect, dim, glow, children }: { rect: Rect; dim: number; glow?: boolean; children?: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute rounded-[2px] border border-white/80 transition-[box-shadow] duration-300"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxShadow: `0 0 0 9999px rgb(0 0 0 / ${dim})${glow ? ', 0 0 0 4px rgb(94 234 212 / 0.25), 0 0 40px rgb(94 234 212 / 0.25)' : ''}`,
      }}
    >
      {children}
    </div>
  )
}
