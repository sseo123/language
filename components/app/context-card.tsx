import type { Phrase } from '@/lib/content'
import { fileUrl } from '@/lib/tauri'
import { cn } from '@/lib/utils'

const APP_COLOR: Record<string, string> = {
  Instagram: 'bg-gradient-to-br from-amber-300 to-rose-400',
  X: 'bg-neutral-900',
  Netflix: 'bg-red-600',
  KakaoTalk: 'bg-yellow-300',
  YouTube: 'bg-red-500',
  Webtoon: 'bg-emerald-500',
  Safari: 'bg-sky-500',
  'Google Chrome': 'bg-gradient-to-br from-red-400 via-yellow-300 to-green-400',
  Arc: 'bg-violet-400',
  Messages: 'bg-green-500',
  Discord: 'bg-indigo-500',
  Slack: 'bg-fuchsia-600',
}

const FALLBACK_COLORS = ['bg-sky-400', 'bg-amber-400', 'bg-rose-400', 'bg-emerald-400', 'bg-violet-400', 'bg-orange-400']

function appColor(app: string) {
  if (APP_COLOR[app]) return APP_COLOR[app]
  let h = 0
  for (const c of app) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]
}

function sourceLabel(source: Phrase['source']) {
  return source.handle ? `${source.app} · ${source.handle}` : source.app
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

/** The captured screen region saved alongside each word. */
export function ContextCard({ phrase, className, size = 'sm' }: { phrase: Phrase; className?: string; size?: 'sm' | 'lg' }) {
  const { source } = phrase
  const image = fileUrl(source.image)
  if (image) {
    return (
      <div className={cn('relative aspect-video overflow-hidden rounded-lg bg-neutral-900', className)}>
        <img src={image} alt="" className="absolute inset-0 size-full object-contain" draggable={false} />
        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85 backdrop-blur">
          {sourceLabel(source)}
        </span>
      </div>
    )
  }
  return (
    <div className={cn('flex aspect-video flex-col justify-center rounded-lg border border-border bg-[#fafafa] p-3', className)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('size-4 shrink-0 rounded-full', appColor(source.app))} />
        <span className={cn('truncate font-medium text-neutral-600', size === 'lg' ? 'text-sm' : 'text-[10px]')}>{sourceLabel(source)}</span>
      </div>
      <p className={cn('mt-1.5 line-clamp-3 leading-snug text-neutral-800', size === 'lg' ? 'text-base' : 'text-[11px]')}>
        <Highlighted text={source.text} term={phrase.term} />
      </p>
    </div>
  )
}
