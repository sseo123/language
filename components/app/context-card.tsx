import Image from 'next/image'
import type { Phrase } from '@/lib/content'
import { cn } from '@/lib/utils'

const APP_COLOR: Record<Phrase['source']['app'], string> = {
  Instagram: 'bg-gradient-to-br from-amber-300 to-rose-400',
  X: 'bg-neutral-900',
  Netflix: 'bg-red-600',
  KakaoTalk: 'bg-yellow-300',
  YouTube: 'bg-red-500',
  Webtoon: 'bg-emerald-500',
}

function Highlighted({ text, term }: { text: string; term: string }) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[3px] bg-brand/35 px-0.5 text-inherit">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}

/** A reconstruction of the captured screen region saved alongside each word. */
export function ContextCard({ phrase, className, size = 'sm' }: { phrase: Phrase; className?: string; size?: 'sm' | 'lg' }) {
  const { source } = phrase
  if (source.image) {
    return (
      <div className={cn('relative aspect-video overflow-hidden rounded-lg bg-black', className)}>
        <Image src={source.image} alt="" fill className="object-cover opacity-90" sizes="400px" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <p
          className={cn(
            'absolute inset-x-2 bottom-[14%] text-center font-semibold text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]',
            size === 'lg' ? 'text-lg' : 'text-[11px]',
          )}
        >
          <Highlighted text={source.text} term={phrase.term} />
        </p>
        <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur">
          {source.app} · {source.handle}
        </span>
      </div>
    )
  }
  return (
    <div className={cn('flex aspect-video flex-col justify-center rounded-lg border border-border bg-[#fafafa] p-3', className)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('size-4 rounded-full', APP_COLOR[source.app])} />
        <span className={cn('font-medium text-neutral-600', size === 'lg' ? 'text-sm' : 'text-[10px]')}>
          {source.app} · {source.handle}
        </span>
      </div>
      <p className={cn('mt-1.5 line-clamp-3 leading-snug text-neutral-800', size === 'lg' ? 'text-base' : 'text-[11px]')}>
        <Highlighted text={source.text} term={phrase.term} />
      </p>
    </div>
  )
}
