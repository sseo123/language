/**
 * Typed bridge to the Rust side. Every function degrades to a no-op or a
 * rejected promise when the UI is opened in a plain browser (vite dev).
 */
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { Phrase } from './content'

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export type ModelConfig = {
  baseUrl: string
  model: string
  transcribeModel: string
  sendScreenshot: boolean
}

export type Rect = { x: number; y: number; w: number; h: number }

export type CaptureSource = { app: string; title: string; pid: number | null }

export type SessionInfo = { sessionId: string; width: number; height: number; source: CaptureSource }

export type FramePayload = { sessionId: string; path: string; source: CaptureSource }

export type OcrLine = { text: string; confidence: number; box: [number, number, number, number] }

export type CropResult = { path: string; width: number; height: number; text: string; lines: OcrLine[] }

export type Permissions = { screen: boolean; mic: boolean }

function notAvailable<T>(): Promise<T> {
  return Promise.reject(new Error('Only available inside the Teachya app'))
}

export const api = {
  startCapture: () => (isTauri ? invoke<void>('start_capture_cmd') : Promise.resolve()),
  endCapture: () => (isTauri ? invoke<void>('end_capture') : Promise.resolve()),
  currentCapture: () => (isTauri ? invoke<SessionInfo | null>('current_capture') : Promise.resolve(null)),
  captureReady: (sessionId: string) => (isTauri ? invoke<void>('capture_ready', { sessionId }) : Promise.resolve()),
  cropFrame: (sessionId: string, rect: Rect, langs: string[]) =>
    isTauri ? invoke<CropResult>('crop_frame', { sessionId, rect, langs }) : notAvailable<CropResult>(),
  explain: (args: { sessionId: string; question: string; comfortLang: string; learningLang: string; config: ModelConfig }) =>
    isTauri ? invoke<Phrase>('explain', args) : notAvailable<Phrase>(),
  transcribe: (audioBase64: string, mime: string, config: ModelConfig) =>
    isTauri ? invoke<string>('transcribe', { audioBase64, mime, config }) : notAvailable<string>(),
  testConnection: (config: ModelConfig) =>
    isTauri ? invoke<{ ok: boolean; message: string }>('test_connection', { config }) : Promise.resolve({ ok: false, message: 'Not running inside the app.' }),
  setHotkey: (shortcut: string) => (isTauri ? invoke<void>('set_hotkey', { shortcut }) : Promise.resolve()),
  showMain: () => (isTauri ? invoke<void>('show_main_window') : Promise.resolve()),
  checkPermissions: () => (isTauri ? invoke<Permissions>('check_permissions') : Promise.resolve({ screen: false, mic: false })),
  requestPermission: (kind: 'screen' | 'mic') =>
    isTauri ? invoke<Permissions>('request_permission', { kind }) : Promise.resolve({ screen: false, mic: false }),
  openPrivacySettings: (pane: 'screen' | 'mic') => (isTauri ? invoke<void>('open_privacy_settings', { pane }) : Promise.resolve()),
  setApiKey: (key: string) => (isTauri ? invoke<void>('set_api_key', { key }) : Promise.resolve()),
  clearApiKey: () => (isTauri ? invoke<void>('clear_api_key') : Promise.resolve()),
  hasApiKey: () => (isTauri ? invoke<boolean>('has_api_key') : Promise.resolve(false)),
}

export function fileUrl(path: string | undefined) {
  if (!path) return undefined
  if (!isTauri || path.startsWith('http') || path.startsWith('/') === false) return path
  // Absolute paths on disk are served through Tauri's asset protocol.
  return path.startsWith('/') && !path.startsWith('/images/') ? convertFileSrc(path) : path
}

export function onEvent<T>(name: string, handler: (payload: T) => void): () => void {
  if (!isTauri) return () => {}
  let unlisten: UnlistenFn | null = null
  let cancelled = false
  listen<T>(name, (e) => handler(e.payload)).then((fn) => {
    if (cancelled) fn()
    else unlisten = fn
  })
  return () => {
    cancelled = true
    unlisten?.()
  }
}

export function emitEvent(name: string, payload?: unknown) {
  if (isTauri) void emit(name, payload)
}
