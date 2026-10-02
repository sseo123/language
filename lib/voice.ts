import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ModelConfig } from './tauri'

export type MicState = 'idle' | 'recording' | 'transcribing' | 'unavailable'

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Hold-to-talk style recording: `start()` opens the microphone, `stop()`
 * sends the clip to the transcription endpoint and resolves with the text.
 */
export function useVoiceInput(config: ModelConfig, onError: (message: string) => void) {
  const [state, setState] = useState<MicState>('idle')
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
    chunks.current = []
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    const mime = pickMime()
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setState('unavailable')
      onError('Voice input is not available in this window.')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s)
      chunks.current = []
      r.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      recorder.current = r
      r.start(250)
      setState('recording')
    } catch {
      setState('unavailable')
      onError('Microphone access was denied. Allow it in System Settings > Privacy & Security > Microphone.')
    }
  }, [onError])

  const stop = useCallback(async (): Promise<string> => {
    const r = recorder.current
    if (!r || r.state === 'inactive') {
      cleanup()
      setState('idle')
      return ''
    }
    setState('transcribing')
    const mime = r.mimeType || 'audio/webm'
    const blob = await new Promise<Blob>((resolve) => {
      r.onstop = () => resolve(new Blob(chunks.current, { type: mime }))
      r.stop()
    })
    cleanup()
    if (blob.size < 2000) {
      setState('idle')
      return ''
    }
    try {
      const text = await api.transcribe(await toBase64(blob), mime, config)
      setState('idle')
      return text
    } catch (e) {
      setState('idle')
      onError(e instanceof Error ? e.message : String(e))
      return ''
    }
  }, [cleanup, config, onError])

  const cancel = useCallback(() => {
    const r = recorder.current
    if (r && r.state !== 'inactive') {
      r.onstop = null
      r.stop()
    }
    cleanup()
    setState('idle')
  }, [cleanup])

  return { state, start, stop, cancel }
}
