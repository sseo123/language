import { useEffect, useRef } from 'react'

type Mode = 'listening' | 'thinking' | 'idle'

/**
 * Siri-style layered waves. Amplitude follows the real microphone when permission
 * is granted; otherwise a speech-like envelope is synthesized so the UI still reads as "hearing you".
 */
export function VoiceWaveform({ mode, className, height = 56 }: { mode: Mode; className?: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let analyser: AnalyserNode | null = null
    let stream: MediaStream | null = null
    let audioCtx: AudioContext | null = null
    let data: Uint8Array<ArrayBuffer> | null = null
    let cancelled = false

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        audioCtx = new AudioContext()
        const src = audioCtx.createMediaStreamSource(s)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        data = new Uint8Array(analyser.fftSize)
        src.connect(analyser)
      })
      .catch(() => {})

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const { width } = canvas.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let level = 0
    let raf = 0
    const start = performance.now()
    const waves = [
      { color: 'rgba(94, 234, 212, 0.9)', freq: 1.6, speed: 0.0042, amp: 1 },
      { color: 'rgba(125, 180, 255, 0.75)', freq: 2.3, speed: -0.0033, amp: 0.75 },
      { color: 'rgba(196, 165, 255, 0.6)', freq: 3.1, speed: 0.0027, amp: 0.55 },
    ]

    const simulated = (t: number) => {
      const syllables = Math.max(0, Math.sin(t * 0.011)) * Math.max(0, Math.sin(t * 0.0031 + 1))
      return 0.25 + syllables * 0.65 + Math.random() * 0.08
    }

    const draw = (now: number) => {
      const t = now - start
      let target = 0.05
      const m = modeRef.current
      if (m === 'listening') {
        if (analyser && data) {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / data.length)
          target = Math.max(0.12, Math.min(1, rms * 6))
        } else {
          target = simulated(t)
        }
      } else if (m === 'thinking') {
        target = 0.12 + Math.sin(t * 0.004) * 0.05
      }
      level += (target - level) * 0.18

      const w = canvas.width
      const h = canvas.height
      const mid = h / 2
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (const wave of waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const nx = (x / w) * 2 - 1
          const envelope = Math.pow(1 - nx * nx, 2)
          const y = mid + Math.sin(nx * Math.PI * wave.freq + t * wave.speed) * envelope * level * wave.amp * (h * 0.42)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = wave.color
        ctx.lineWidth = 2 * dpr
        ctx.shadowColor = wave.color
        ctx.shadowBlur = 10 * dpr
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      stream?.getTracks().forEach((tr) => tr.stop())
      audioCtx?.close()
    }
  }, [height])

  return <canvas ref={canvasRef} className={className} style={{ height, width: '100%' }} aria-hidden="true" />
}
