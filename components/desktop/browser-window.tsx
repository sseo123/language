import Image from 'next/image'
import { ChevronLeft, ChevronRight, Heart, Lock, MessageCircle, Pause, Repeat2, RotateCw, Share, Volume2 } from 'lucide-react'

function P({ id, children }: { id: string; children: React.ReactNode }) {
  return <span data-phrase={id}>{children}</span>
}

export function BrowserWindow() {
  return (
    <section
      aria-label="Safari window"
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-black/20 bg-white shadow-[0_30px_80px_-10px_rgb(0_0_0/0.45)]"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-black/10 bg-[#f6f6f7] px-4">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-3 flex text-black/40">
          <ChevronLeft className="size-5" />
          <ChevronRight className="size-5" />
        </div>
        <div className="mx-auto flex h-8 w-full max-w-md items-center justify-center gap-1.5 rounded-lg bg-black/[0.05] text-[13px] text-black/70">
          <Lock className="size-3" />
          pulse.social/for-you
        </div>
        <RotateCw className="size-4 text-black/40" />
        <Share className="size-4 text-black/40" />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#fafafa]">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-[1.35fr_1fr]">
          <article className="flex flex-col gap-3">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <Image src="/images/drama-still.png" alt="Two people talking in a cafe at dusk" fill className="object-cover" priority />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute inset-x-0 bottom-12 text-center text-xl font-semibold text-white [text-shadow:0_2px_6px_rgb(0_0_0/0.9)] md:text-2xl">
                왜 이렇게 <P id="nunchi">눈치</P>가 없어?
              </p>
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 text-white">
                <Pause className="size-4" fill="currentColor" />
                <div className="h-1 flex-1 rounded-full bg-white/30">
                  <div className="h-full w-[38%] rounded-full bg-white" />
                </div>
                <span className="font-mono text-xs">14:22</span>
                <Volume2 className="size-4" />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">서울의 오후 — Episode 4 clip</h2>
              <p className="text-sm text-neutral-500">Drama Clips · 1.2M views</p>
            </div>
          </article>

          <div className="flex flex-col gap-4">
            <article className="rounded-xl border border-black/[0.06] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-gradient-to-br from-amber-300 to-rose-400" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-neutral-900">seoul.daily</p>
                  <p className="text-xs text-neutral-500">Seoul · 2h</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
                오늘 회의에서 팀장님 농담에 아무도 안 웃어서 완전 <P id="gapbunssa">갑분싸</P> 됐어. 그래도 점심은 내가{' '}
                <P id="ssolge">쏠게</P>!
              </p>
              <div className="mt-3 flex gap-5 text-neutral-400">
                <span className="flex items-center gap-1.5 text-xs"><Heart className="size-4" /> 2,481</span>
                <span className="flex items-center gap-1.5 text-xs"><MessageCircle className="size-4" /> 312</span>
              </div>
            </article>

            <article className="rounded-xl border border-black/[0.06] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-gradient-to-br from-sky-300 to-indigo-500" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-neutral-900">Maya Chen</p>
                  <p className="text-xs text-neutral-500">@maya.codes · 5h</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
                Not gonna lie, this new café <P id="hits-different">hits different</P> at 7am. <P id="no-cap">No cap</P>, best flat
                white in the city.
              </p>
              <div className="mt-3 flex gap-5 text-neutral-400">
                <span className="flex items-center gap-1.5 text-xs"><MessageCircle className="size-4" /> 48</span>
                <span className="flex items-center gap-1.5 text-xs"><Repeat2 className="size-4" /> 120</span>
                <span className="flex items-center gap-1.5 text-xs"><Heart className="size-4" /> 1,094</span>
              </div>
            </article>

            <article className="rounded-xl border border-black/[0.06] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Trending in Seoul</p>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-neutral-700">
                <li>#퇴근길 · 18.2K posts</li>
                <li>#오늘의커피 · 9,410 posts</li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
