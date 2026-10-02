import { cn } from '@/lib/utils'

export function LumenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn('size-4', className)}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}

export function LumenAppIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[22%] bg-gradient-to-br from-[#1f2a37] to-[#0e141b] text-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_6px_16px_rgb(0_0_0/0.25)]',
        className,
      )}
    >
      <LumenMark className="size-[56%]" />
    </div>
  )
}

export function OptionGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('inline-block size-[1em] align-[-0.125em]', className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Option" role="img">
      <path d="M1.5 4h4l5 8h4M10 4h4.5" />
    </svg>
  )
}

export function withGlyphs(text: React.ReactNode) {
  if (typeof text !== 'string' || !text.includes('⌥')) return text
  return text.split('⌥').flatMap((part, i) => (i === 0 ? [part] : [<OptionGlyph key={i} />, part]))
}

export function Kbd({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  children = withGlyphs(children)
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1.5 font-sans text-[11px] font-medium',
        dark
          ? 'border border-white/15 bg-white/10 text-white/80'
          : 'border border-border bg-card text-muted-foreground shadow-[0_1px_0_var(--border)]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
