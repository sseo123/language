import { useState } from 'react'
import { Search, Trash2, Volume2, X } from 'lucide-react'
import { langInfo, tr, UI, type LangCode, type Phrase } from '@/lib/content'
import { formatSaved, isFreshlySaved, useStore, type VocabEntry } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ContextCard } from './context-card'
import { MasteryBar, ViewHeader } from './app-window'

type Filter = { id: string; label: string; test: (v: VocabEntry) => boolean }

export function VocabularyView() {
  const { vocab, settings } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const lang = settings.comfortLang

  // One tab per language present in the deck, plus a review tab.
  const langsInDeck = [...new Set(vocab.map((v) => v.phrase.lang))] as LangCode[]
  const filters: Filter[] = [
    { id: 'all', label: 'All', test: () => true },
    ...langsInDeck.map((code) => ({ id: code, label: langInfo(code).english, test: (v: VocabEntry) => v.phrase.lang === code })),
    { id: 'review', label: 'Needs review', test: (v: VocabEntry) => v.mastery < 0.6 },
  ]
  const activeFilter = filters.find((f) => f.id === filter) ?? filters[0]

  const items = vocab.filter((v) => {
    if (!activeFilter.test(v)) return false
    const q = query.trim().toLowerCase()
    return !q || v.phrase.term.toLowerCase().includes(q) || tr(v.phrase.shortMeaning, lang).toLowerCase().includes(q)
  })

  const active = selected ? vocab.find((v) => v.phrase.id === selected) : null

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1">
        <ViewHeader
          title="Vocabulary"
          subtitle={`${vocab.length} words and phrases, each saved with where you found it.`}
          action={
            <label className="relative">
              <span className="sr-only">Search vocabulary</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-8 w-52 rounded-lg border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          }
        />
        <div className="px-8 py-5">
          <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Filter">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={activeFilter.id === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
                  activeFilter.id === f.id ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {vocab.length === 0 ? 'Nothing saved yet. Capture something on screen and save it to your deck.' : 'Nothing matches.'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {items.map((v) => (
                <li key={v.phrase.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(v.phrase.id)}
                    className={cn(
                      'w-full rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md',
                      selected === v.phrase.id ? 'border-foreground' : 'border-border',
                      isFreshlySaved(v) && 'ring-2 ring-brand/40',
                    )}
                  >
                    <ContextCard phrase={v.phrase} />
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{v.phrase.term}</p>
                      <span className="text-[11px] text-muted-foreground">{formatSaved(v.savedAt)}</span>
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">{tr(v.phrase.shortMeaning, lang)}</p>
                    <MasteryBar value={v.mastery} className="mt-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {active && <DetailPane entry={active} phrase={active.phrase} onClose={() => setSelected(null)} />}
    </div>
  )
}

function DetailPane({ entry, phrase, onClose }: { entry: VocabEntry; phrase: Phrase; onClose: () => void }) {
  const { settings, removeWord } = useStore()
  const lang = settings.comfortLang
  const speak = () => {
    const u = new SpeechSynthesisUtterance(phrase.term)
    u.lang = langInfo(phrase.lang).locale
    window.speechSynthesis?.speak(u)
  }
  const remove = () => {
    removeWord(phrase.id)
    onClose()
  }
  return (
    <aside className="sticky top-0 h-full max-h-full w-[340px] shrink-0 overflow-y-auto border-l border-border bg-card p-6 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{phrase.term}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {phrase.reading && <span className="font-mono">{phrase.reading} · </span>}
            {tr(phrase.partOfSpeech, lang)}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={speak} aria-label="Hear pronunciation" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <Volume2 className="size-4" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Original context</p>
      <ContextCard phrase={phrase} size="lg" />
      <Block label={tr(UI.definition, lang)}>{tr(phrase.definition, lang)}</Block>
      <Block label={tr(UI.context, lang)}>{tr(phrase.contextMeaning, lang)}</Block>
      <Block label={tr(UI.tone, lang)}>{tr(phrase.tone, lang)}</Block>
      <div className="mt-6 rounded-xl bg-secondary p-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Mastery</span>
          <span className="font-medium tabular-nums">{Math.round(entry.mastery * 100)}%</span>
        </div>
        <MasteryBar value={entry.mastery} className="mt-2" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          {entry.attempts} reviews · {entry.misses} missed
        </p>
      </div>
      <button
        type="button"
        onClick={remove}
        className="mt-4 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" /> Remove from deck
      </button>
    </aside>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}
