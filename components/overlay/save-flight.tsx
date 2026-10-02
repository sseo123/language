import { useEffect, useRef } from 'react'
import { BookmarkPlus } from 'lucide-react'

export type Flight = { id: number; term: string; from: { x: number; y: number }; to: { x: number; y: number } }

export function SaveFlight({ flight, onLand }: { flight: Flight; onLand: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const landRef = useRef(onLand)
  landRef.current = onLand

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { from, to } = flight
    const midX = from.x + (to.x - from.x) * 0.45
    const midY = Math.min(from.y, to.y) - 140
    const anim = el.animate(
      [
        { transform: `translate(${from.x}px, ${from.y}px) translate(-50%, -50%) scale(0.6)`, opacity: 0 },
        { transform: `translate(${from.x}px, ${from.y - 24}px) translate(-50%, -50%) scale(1.08)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${midX}px, ${midY}px) translate(-50%, -50%) scale(1) rotate(-6deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${to.x}px, ${to.y}px) translate(-50%, -50%) scale(0.25) rotate(0deg)`, opacity: 0.4 },
      ],
      { duration: 1100, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
    )
    anim.onfinish = () => landRef.current()
    return () => anim.cancel()
  }, [flight])

  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-[80]" aria-hidden="true" style={{ opacity: 0 }}>
      <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-brand/40 bg-[#0d1117]/90 py-2 pl-2.5 pr-4 text-[15px] font-semibold text-white shadow-[0_0_30px_rgb(94_234_212/0.45)] backdrop-blur-xl">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <BookmarkPlus className="size-3.5" />
        </span>
        {flight.term}
      </div>
    </div>
  )
}
