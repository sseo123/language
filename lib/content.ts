export type LangCode = 'en' | 'ko' | 'ja' | 'es' | 'zh' | 'fr'

export type L10n = { en: string; ko: string }

export const LANGUAGES: { code: LangCode; native: string; english: string; locale: string }[] = [
  { code: 'en', native: 'English', english: 'English', locale: 'en-US' },
  { code: 'ko', native: '한국어', english: 'Korean', locale: 'ko-KR' },
  { code: 'ja', native: '日本語', english: 'Japanese', locale: 'ja-JP' },
  { code: 'es', native: 'Español', english: 'Spanish', locale: 'es-ES' },
  { code: 'zh', native: '中文', english: 'Chinese', locale: 'zh-CN' },
  { code: 'fr', native: 'Français', english: 'French', locale: 'fr-FR' },
]

export function langInfo(code: LangCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

export function tr(value: L10n, lang: LangCode) {
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

export type SourceApp = 'Instagram' | 'X' | 'Netflix' | 'KakaoTalk' | 'YouTube' | 'Webtoon'

export type Phrase = {
  id: string
  term: string
  reading?: string
  lang: 'ko' | 'en'
  partOfSpeech: L10n
  tags: L10n[]
  definition: L10n
  contextMeaning: L10n
  tone: L10n
  examples: { text: string; gloss: L10n }[]
  followUps: { q: L10n; a: L10n }[]
  shortMeaning: L10n
  cloze: { sentence: string; answer: string }
  source: { app: SourceApp; handle: string; text: string; image?: string }
}

export const PHRASES: Phrase[] = [
  {
    id: 'nunchi',
    term: '눈치',
    reading: 'nunchi',
    lang: 'ko',
    partOfSpeech: { en: 'noun', ko: '명사' },
    tags: [
      { en: 'Everyday', ko: '일상어' },
      { en: 'Cultural concept', ko: '문화 개념' },
    ],
    definition: {
      en: 'The ability to read a room — sensing other people’s feelings and unspoken expectations, then acting appropriately.',
      ko: '분위기나 상대의 기분, 말하지 않은 기대를 재빨리 알아차리고 맞게 행동하는 능력.',
    },
    contextMeaning: {
      en: '“왜 이렇게 눈치가 없어?” means “Why can’t you read the room?” — she expected him to pick up on an obvious cue and he didn’t.',
      ko: '“왜 이렇게 눈치가 없어?”는 상대가 뻔한 신호를 알아차리지 못해 답답하다는 뜻이에요.',
    },
    tone: {
      en: 'A light scolding between close friends. Saying 눈치가 없다 to a stranger or a senior would sound rude.',
      ko: '친한 사이에서 쓰는 가벼운 핀잔이에요. 윗사람이나 처음 보는 사람에게 쓰면 무례하게 들려요.',
    },
    examples: [
      { text: '눈치가 빠르다', gloss: { en: 'to be quick to read the room', ko: '분위기를 잘 파악한다' } },
      { text: '눈치 보지 마.', gloss: { en: 'Don’t worry about what others think.', ko: '남의 시선 신경 쓰지 마.' } },
      { text: '눈치껏 해.', gloss: { en: 'Read the situation and use your judgment.', ko: '상황 봐서 알아서 해.' } },
    ],
    followUps: [
      {
        q: { en: 'Is there an English equivalent?', ko: '영어로 비슷한 표현이 있어?' },
        a: {
          en: '“Reading the room” is closest, but 눈치 is broader — in Korean culture it’s treated as an everyday social skill, almost a sixth sense.',
          ko: '“read the room”이 가장 가깝지만, 눈치는 한국 문화에서 일상적인 사회적 감각으로 훨씬 넓게 쓰여요.',
        },
      },
      {
        q: { en: 'How do I say someone is good at it?', ko: '눈치 있는 사람을 칭찬하려면?' },
        a: {
          en: 'Say 눈치가 빠르다 (“quick nunchi”). The opposite is 눈치가 없다 or 눈치가 느리다.',
          ko: '“눈치가 빠르다”라고 해요. 반대는 “눈치가 없다”, “눈치가 느리다”예요.',
        },
      },
      {
        q: { en: 'What does 눈치 보다 mean?', ko: '“눈치 보다”는 무슨 뜻이야?' },
        a: {
          en: 'To tiptoe around others’ reactions. 상사 눈치 보느라 퇴근을 못 했어 = “I couldn’t leave because I was worried how my boss would react.”',
          ko: '남의 반응을 신경 쓰며 조심한다는 뜻이에요. 예: “상사 눈치 보느라 퇴근을 못 했어.”',
        },
      },
    ],
    shortMeaning: { en: 'the ability to read the room', ko: '분위기를 파악하는 능력' },
    cloze: { sentence: '왜 이렇게 ___가 없어?', answer: '눈치' },
    source: { app: 'Netflix', handle: '서울의 오후 · Ep. 4', text: '왜 이렇게 눈치가 없어?', image: '/images/drama-still.png' },
  },
  {
    id: 'gapbunssa',
    term: '갑분싸',
    reading: 'gap-bun-ssa',
    lang: 'ko',
    partOfSpeech: { en: 'slang · abbreviation', ko: '신조어 · 줄임말' },
    tags: [
      { en: 'Internet slang', ko: '인터넷 신조어' },
      { en: 'Casual', ko: '반말' },
    ],
    definition: {
      en: 'Short for 갑자기 분위기 싸해짐 — “the mood suddenly turned cold.” Used when a moment becomes awkward out of nowhere.',
      ko: '“갑자기 분위기 싸해짐”의 줄임말. 갑자기 분위기가 어색하고 썰렁해질 때 써요.',
    },
    contextMeaning: {
      en: 'Nobody laughed at the team lead’s joke in the meeting, so the room went instantly, painfully quiet.',
      ko: '회의에서 팀장님 농담에 아무도 웃지 않아 순간 분위기가 얼어붙은 상황이에요.',
    },
    tone: {
      en: 'Playful internet slang. Fine with friends and on social media — avoid it in formal writing or around elders.',
      ko: '장난스러운 인터넷 신조어예요. 친구 사이나 SNS에서는 괜찮지만, 공식적인 자리나 어른 앞에서는 피하세요.',
    },
    examples: [
      { text: '내 농담 하나에 갑분싸.', gloss: { en: 'One joke from me and the room went dead.', ko: '내 농담 하나에 분위기가 싸해졌어.' } },
      { text: '갑분싸 만들지 마.', gloss: { en: 'Don’t make it awkward.', ko: '분위기 깨지 마.' } },
    ],
    followUps: [
      {
        q: { en: 'Is this still trendy?', ko: '아직도 많이 써?' },
        a: {
          en: 'It peaked around 2018–2019 but is still widely understood. Teens may find it slightly dated — which can be funny in itself.',
          ko: '2018~2019년에 가장 유행했지만 지금도 널리 통해요. 10대에게는 조금 옛날 말처럼 들릴 수 있어요.',
        },
      },
      {
        q: { en: 'Are there other words like this?', ko: '비슷한 줄임말이 또 있어?' },
        a: {
          en: 'Korean loves syllable acronyms: 별다줄 (“you abbreviate everything”), 할말하않 (“lots to say, but I won’t”), 갑툭튀 (“popped out of nowhere”).',
          ko: '“별다줄(별걸 다 줄인다)”, “할말하않(할 말은 많지만 하지 않겠다)”, “갑툭튀(갑자기 툭 튀어나옴)” 등이 있어요.',
        },
      },
    ],
    shortMeaning: { en: 'the mood suddenly turned awkward', ko: '갑자기 분위기가 싸해짐' },
    cloze: { sentence: '농담 하나에 완전 ___ 됐어.', answer: '갑분싸' },
    source: {
      app: 'Instagram',
      handle: '@seoul.daily',
      text: '오늘 회의에서 팀장님 농담에 아무도 안 웃어서 완전 갑분싸 됐어. 그래도 점심은 내가 쏠게!',
    },
  },
  {
    id: 'ssolge',
    term: '쏠게',
    reading: 'ssol-ge',
    lang: 'ko',
    partOfSpeech: { en: 'verb · from 쏘다', ko: '동사 · 쏘다' },
    tags: [
      { en: 'Colloquial', ko: '구어체' },
      { en: 'Friendly', ko: '친근함' },
    ],
    definition: {
      en: 'Casual promise form of 쏘다, literally “to shoot.” In everyday speech it means to treat someone — to pay for food or drinks.',
      ko: '“쏘다”의 구어체 약속형. 원래 “총을 쏘다”의 뜻이지만, 일상에서는 “한턱내다, 대신 계산하다”라는 의미로 써요.',
    },
    contextMeaning: {
      en: 'After the awkward meeting, the writer offers to buy lunch to lift everyone’s mood — “Lunch is on me!”',
      ko: '어색했던 회의 후 분위기를 풀려고 “점심은 내가 살게”라고 말하는 상황이에요.',
    },
    tone: {
      en: 'Warm and generous. With a superior, say 제가 살게요 or 제가 대접할게요 instead.',
      ko: '친근하고 호탕한 느낌이에요. 윗사람에게는 “제가 살게요”나 “제가 대접할게요”가 더 자연스러워요.',
    },
    examples: [
      { text: '오늘 커피는 내가 쏜다!', gloss: { en: 'Coffee’s on me today!', ko: '오늘 커피는 내가 살게!' } },
      { text: '승진 기념으로 한턱 쏴!', gloss: { en: 'Treat us to celebrate your promotion!', ko: '승진했으니 한턱내!' } },
    ],
    followUps: [
      {
        q: { en: 'Why does “shoot” mean “pay”?', ko: '왜 “쏘다”가 “사다”라는 뜻이야?' },
        a: {
          en: 'It comes from the image of firing off money in one generous burst. 한턱 쏘다 (“shoot a treat”) is the common full phrase.',
          ko: '돈을 시원하게 한 번에 “쏘아” 낸다는 이미지에서 왔어요. “한턱 쏘다”라는 표현으로도 많이 써요.',
        },
      },
      {
        q: { en: 'How do I accept politely?', ko: '정중하게 대답하려면?' },
        a: {
          en: 'Say 잘 먹겠습니다! before eating (“I’ll eat well — thank you!”) and 잘 먹었습니다 afterward.',
          ko: '먹기 전에는 “잘 먹겠습니다!”, 먹은 후에는 “잘 먹었습니다!”라고 하면 돼요.',
        },
      },
    ],
    shortMeaning: { en: 'to treat someone (pay)', ko: '한턱내다, 대신 사다' },
    cloze: { sentence: '점심은 내가 ___!', answer: '쏠게' },
    source: {
      app: 'Instagram',
      handle: '@seoul.daily',
      text: '오늘 회의에서 팀장님 농담에 아무도 안 웃어서 완전 갑분싸 됐어. 그래도 점심은 내가 쏠게!',
    },
  },
  {
    id: 'hits-different',
    term: 'hits different',
    lang: 'en',
    partOfSpeech: { en: 'slang · verb phrase', ko: '속어 · 동사구' },
    tags: [
      { en: 'Gen Z', ko: 'MZ세대' },
      { en: 'Positive', ko: '긍정적' },
    ],
    definition: {
      en: 'Said when something feels unusually good or special — better than expected, often because of the moment or setting.',
      ko: '어떤 것이 특정한 순간이나 상황 때문에 유난히 좋게, 특별하게 느껴질 때 쓰는 표현이에요.',
    },
    contextMeaning: {
      en: 'The café feels especially great at 7am — the quiet early morning makes the whole experience better than usual.',
      ko: '아침 7시의 조용한 분위기 때문에 이 카페가 유난히 좋게 느껴진다는 뜻이에요.',
    },
    tone: {
      en: 'Very casual and online. Grammatically “wrong” on purpose — don’t “fix” it to “differently.”',
      ko: '아주 캐주얼한 인터넷 표현이에요. 문법적으로는 “differently”가 맞지만 일부러 이렇게 써요.',
    },
    examples: [
      { text: 'Coffee hits different after a long run.', gloss: { en: 'Coffee tastes extra good after running.', ko: '긴 달리기 후의 커피는 유독 맛있어.' } },
      { text: 'This song hits different at night.', gloss: { en: 'The song feels more powerful at night.', ko: '이 노래는 밤에 들으면 느낌이 달라.' } },
    ],
    followUps: [
      {
        q: { en: 'Can it be negative?', ko: '부정적으로도 쓸 수 있어?' },
        a: {
          en: 'Rarely. “That comment hit different” can mean it stung — but most of the time it’s positive.',
          ko: '드물어요. 가끔 “그 말이 아프게 와닿았다”는 뜻으로 쓰지만, 대부분은 긍정적이에요.',
        },
      },
      {
        q: { en: 'Can I use this at work?', ko: '회사에서 써도 돼?' },
        a: {
          en: 'Only in a casual chat with peers. In emails or presentations, say “is especially good” or “feels special.”',
          ko: '동료끼리의 가벼운 메신저 정도는 괜찮지만, 이메일이나 발표에서는 “is especially good”이 좋아요.',
        },
      },
    ],
    shortMeaning: { en: 'feels especially good or special', ko: '유난히 좋게 느껴진다' },
    cloze: { sentence: 'This new café ___ at 7am.', answer: 'hits different' },
    source: {
      app: 'X',
      handle: '@maya.codes',
      text: 'Not gonna lie, this new café hits different at 7am. No cap, best flat white in the city.',
    },
  },
  {
    id: 'no-cap',
    term: 'no cap',
    lang: 'en',
    partOfSpeech: { en: 'slang · interjection', ko: '속어 · 감탄사' },
    tags: [
      { en: 'Slang', ko: '속어' },
      { en: 'Emphatic', ko: '강조' },
    ],
    definition: {
      en: 'Means “no lie” or “for real.” Used to stress that you’re being completely honest — “cap” means a lie.',
      ko: '“진짜로, 거짓말 아니고”라는 뜻이에요. “cap”은 거짓말을 뜻하는 속어예요.',
    },
    contextMeaning: {
      en: 'The writer is stressing sincerity: they genuinely believe it’s the best flat white in the city.',
      ko: '도시에서 제일 맛있는 플랫화이트라는 걸 진심으로 강조하는 거예요.',
    },
    tone: {
      en: 'Casual; rooted in AAVE and hip-hop, now mainstream online. Sounds forced in formal settings.',
      ko: '흑인 영어(AAVE)와 힙합에서 유래해 인터넷에서 대중화됐어요. 격식 있는 자리에서는 어색해요.',
    },
    examples: [
      { text: 'Best concert of my life, no cap.', gloss: { en: 'Honestly the best concert ever.', ko: '진짜 인생 최고의 콘서트였어.' } },
      { text: 'Stop capping.', gloss: { en: 'Stop lying / exaggerating.', ko: '거짓말 좀 그만해.' } },
    ],
    followUps: [
      {
        q: { en: 'What does “cap” mean on its own?', ko: '“cap”만 쓰면?' },
        a: {
          en: '“That’s cap” = “That’s a lie.” People also reply with a cap emoji to mean “I don’t believe you.”',
          ko: '“That’s cap”은 “그거 거짓말이야”라는 뜻이에요. 모자 이모지로 답장하면 “못 믿겠어”라는 뜻이에요.',
        },
      },
      {
        q: { en: 'Is it okay for me to use as a learner?', ko: '외국인이 써도 자연스러워?' },
        a: {
          en: 'With friends online, yes. In speech it can sound like you’re trying too hard unless your circle already uses it.',
          ko: '온라인에서 친구끼리라면 괜찮아요. 말로 할 때는 주변에서 이미 쓰는 경우가 아니면 어색할 수 있어요.',
        },
      },
    ],
    shortMeaning: { en: 'for real, no lie', ko: '진짜로, 거짓말 아니고' },
    cloze: { sentence: '___, best flat white in the city.', answer: 'No cap' },
    source: {
      app: 'X',
      handle: '@maya.codes',
      text: 'Not gonna lie, this new café hits different at 7am. No cap, best flat white in the city.',
    },
  },
  {
    id: 'eoieopda',
    term: '어이없다',
    reading: 'eo-i-eop-da',
    lang: 'ko',
    partOfSpeech: { en: 'adjective', ko: '형용사' },
    tags: [{ en: 'Exasperated', ko: '황당함' }],
    definition: {
      en: 'To be dumbfounded — something is so absurd you’re left speechless.',
      ko: '너무 황당해서 말이 안 나온다.',
    },
    contextMeaning: {
      en: 'A ₩50,000 taxi fare was so unreasonable the speaker was stunned.',
      ko: '택시비가 5만 원이나 나와 황당하다는 뜻이에요.',
    },
    tone: { en: 'Exasperated and casual.', ko: '어이없고 답답한 느낌의 구어체.' },
    examples: [{ text: '진짜 어이가 없네.', gloss: { en: 'This is unbelievable.', ko: '정말 황당하네.' } }],
    followUps: [],
    shortMeaning: { en: 'absurd, unbelievable', ko: '황당하다' },
    cloze: { sentence: '택시비가 5만 원? 진짜 ___.', answer: '어이없다' },
    source: { app: 'KakaoTalk', handle: '지민', text: '택시비가 5만 원? 진짜 어이없다.' },
  },
  {
    id: 'lowkey',
    term: 'lowkey',
    lang: 'en',
    partOfSpeech: { en: 'adverb · slang', ko: '부사 · 속어' },
    tags: [{ en: 'Casual', ko: '캐주얼' }],
    definition: {
      en: 'Slightly, secretly, or without making a big deal of it.',
      ko: '은근히, 살짝, 티 안 나게.',
    },
    contextMeaning: {
      en: 'The commenter is quietly, half-seriously considering moving after the video.',
      ko: '영상을 보고 은근히 이사를 진지하게 고민 중이라는 뜻이에요.',
    },
    tone: { en: 'Relaxed, understated.', ko: '가볍고 담백한 느낌.' },
    examples: [{ text: 'I’m lowkey tired.', gloss: { en: 'I’m kind of tired.', ko: '나 은근 피곤해.' } }],
    followUps: [],
    shortMeaning: { en: 'secretly, kind of', ko: '은근히, 살짝' },
    cloze: { sentence: 'I ___ want to move to Lisbon after this video.', answer: 'lowkey' },
    source: { app: 'YouTube', handle: 'comment · @nomadnotes', text: 'I lowkey want to move to Lisbon after this video.' },
  },
  {
    id: 'dapjeongneo',
    term: '답정너',
    reading: 'dap-jeong-neo',
    lang: 'ko',
    partOfSpeech: { en: 'slang · abbreviation', ko: '신조어 · 줄임말' },
    tags: [{ en: 'Internet slang', ko: '인터넷 신조어' }],
    definition: {
      en: 'Short for 답은 정해져 있고 너는 대답만 하면 돼 — “the answer’s decided, you just say it.” A question fishing for one specific response.',
      ko: '“답은 정해져 있고 너는 대답만 하면 돼”의 줄임말.',
    },
    contextMeaning: {
      en: '“Did I gain weight?” is a question where the only acceptable answer is “no.”',
      ko: '“나 살쪘지?”는 “아니”라는 대답만 허용되는 질문이라는 뜻이에요.',
    },
    tone: { en: 'Teasing, playful.', ko: '장난스럽게 놀리는 느낌.' },
    examples: [{ text: '너 또 답정너야?', gloss: { en: 'Fishing for compliments again?', ko: '또 정해진 답 듣고 싶은 거야?' } }],
    followUps: [],
    shortMeaning: { en: 'fishing for a set answer', ko: '정해진 답을 듣고 싶어 함' },
    cloze: { sentence: '“나 살쪘지?” 이건 완전 ___ 질문이지.', answer: '답정너' },
    source: { app: 'Webtoon', handle: '연애혁명 · 212화', text: '“나 살쪘지?” 이건 완전 답정너 질문이지.' },
  },
  {
    id: 'seonbae',
    term: '선배',
    reading: 'seon-bae',
    lang: 'ko',
    partOfSpeech: { en: 'noun · title', ko: '명사 · 호칭' },
    tags: [{ en: 'Honorific', ko: '호칭' }],
    definition: {
      en: 'A senior — someone who started school or work before you.',
      ko: '학교나 직장에 나보다 먼저 들어온 사람.',
    },
    contextMeaning: {
      en: 'A junior colleague casually invites a senior to leave work together.',
      ko: '후배가 선배에게 같이 퇴근하자고 말하는 상황이에요.',
    },
    tone: { en: 'Respectful but warm.', ko: '존중하면서도 친근한 느낌.' },
    examples: [{ text: '선배님, 감사합니다.', gloss: { en: 'Thank you, sunbae (respectful).', ko: '선배님, 감사합니다.' } }],
    followUps: [],
    shortMeaning: { en: 'senior (at school or work)', ko: '먼저 들어온 사람' },
    cloze: { sentence: '___, 오늘 같이 퇴근해요.', answer: '선배' },
    source: { app: 'Netflix', handle: '오피스 로맨스 · Ep. 2', text: '선배, 오늘 같이 퇴근해요.' },
  },
]

export const PHRASE_MAP: Record<string, Phrase> = Object.fromEntries(PHRASES.map((p) => [p.id, p]))
