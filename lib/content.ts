export type LangCode = 'en' | 'ko' | 'ja' | 'es' | 'zh' | 'fr'

/**
 * UI strings ship in English and Korean. Phrases produced by the model are
 * plain strings already written in the learner's comfort language.
 */
export type L10n = string | { en: string; ko: string }

export const LANGUAGES: { code: LangCode; native: string; english: string; locale: string }[] = [
  { code: 'en', native: 'English', english: 'English', locale: 'en-US' },
  { code: 'ko', native: '한국어', english: 'Korean', locale: 'ko-KR' },
  { code: 'ja', native: '日本語', english: 'Japanese', locale: 'ja-JP' },
  { code: 'es', native: 'Español', english: 'Spanish', locale: 'es-ES' },
  { code: 'zh', native: '中文', english: 'Chinese', locale: 'zh-CN' },
  { code: 'fr', native: 'Français', english: 'French', locale: 'fr-FR' },
]

export const LANG_CODES = new Set<LangCode>(LANGUAGES.map((l) => l.code))

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && LANG_CODES.has(value as LangCode)
}

export function langInfo(code: LangCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

export function tr(value: L10n, lang: LangCode) {
  if (typeof value === 'string') return value
  return lang === 'ko' ? value.ko : value.en
}

export const SPOKEN_QUESTION: Record<LangCode, string> = {
  en: 'What does this mean here? Is it casual?',
  ko: '여기서 이거 무슨 뜻이야? 반말이야?',
  ja: 'これはここでどういう意味？カジュアルな言い方？',
  es: '¿Qué significa esto aquí? ¿Es informal?',
  zh: '这里是什么意思？是口语吗？',
  fr: 'Ça veut dire quoi ici ? C’est familier ?',
}

export const UI: Record<string, L10n> = {
  explainedIn: { en: 'Explained in English', ko: '한국어로 설명' },
  definition: { en: 'Meaning', ko: '뜻' },
  context: { en: 'In this context', ko: '이 맥락에서' },
  tone: { en: 'Tone & nuance', ko: '뉘앙스' },
  examples: { en: 'How it’s used', ko: '이렇게 써요' },
  followUp: { en: 'Ask a follow-up', ko: '이어서 물어보기' },
  save: { en: 'Save to deck', ko: '단어장에 저장' },
  saved: { en: 'Saved to deck', ko: '저장됨' },
  askAgain: { en: 'Ask again', ko: '다시 묻기' },
  youAsked: { en: 'You asked', ko: '내 질문' },
}

export type PhraseSource = {
  /** Name of the app the text was captured from, e.g. "Safari" or "Netflix". */
  app: string
  /** Window title or account handle shown next to the app name. */
  handle: string
  /** Text recognized in the selection. */
  text: string
  /** Absolute path of the saved screenshot crop. */
  image?: string
}

export type Phrase = {
  id: string
  term: string
  reading?: string
  lang: LangCode
  partOfSpeech: L10n
  tags: L10n[]
  definition: L10n
  contextMeaning: L10n
  tone: L10n
  examples: { text: string; gloss: L10n }[]
  followUps: { q: L10n; a: L10n }[]
  shortMeaning: L10n
  cloze: { sentence: string; answer: string }
  source: PhraseSource
}

function isL10n(v: unknown): v is L10n {
  if (typeof v === 'string') return true
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.en === 'string' && typeof o.ko === 'string'
}

/** Validates a phrase coming from storage or from the model. */
export function parsePhrase(value: unknown): Phrase | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Record<string, unknown>
  if (typeof p.id !== 'string' || typeof p.term !== 'string' || !p.term.trim()) return null
  if (!isLangCode(p.lang)) return null
  const source = (p.source ?? {}) as Record<string, unknown>
  const cloze = (p.cloze ?? {}) as Record<string, unknown>
  const str = (v: unknown): L10n => (isL10n(v) ? v : '')
  return {
    id: p.id,
    term: p.term,
    reading: typeof p.reading === 'string' && p.reading ? p.reading : undefined,
    lang: p.lang,
    partOfSpeech: str(p.partOfSpeech),
    tags: Array.isArray(p.tags) ? p.tags.filter(isL10n) : [],
    definition: str(p.definition),
    contextMeaning: str(p.contextMeaning),
    tone: str(p.tone),
    examples: Array.isArray(p.examples)
      ? p.examples
          .filter((e): e is { text: string; gloss: unknown } => !!e && typeof (e as { text?: unknown }).text === 'string')
          .map((e) => ({ text: e.text, gloss: str(e.gloss) }))
      : [],
    followUps: Array.isArray(p.followUps)
      ? p.followUps
          .filter((f): f is { q: unknown; a: unknown } => !!f && isL10n((f as { q?: unknown }).q) && isL10n((f as { a?: unknown }).a))
          .map((f) => ({ q: f.q as L10n, a: f.a as L10n }))
      : [],
    shortMeaning: str(p.shortMeaning),
    cloze: {
      sentence: typeof cloze.sentence === 'string' ? cloze.sentence : '',
      answer: typeof cloze.answer === 'string' && cloze.answer ? cloze.answer : p.term,
    },
    source: {
      app: typeof source.app === 'string' && source.app ? source.app : 'Screen',
      handle: typeof source.handle === 'string' ? source.handle : '',
      text: typeof source.text === 'string' ? source.text : '',
      image: typeof source.image === 'string' && source.image ? source.image : undefined,
    },
  }
}
