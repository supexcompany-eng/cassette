import { useCallback, useEffect, useRef, useState } from 'react'

export interface RecordingResult {
  blob: Blob
  durationSeconds: number
  mimeType: string
}

export interface UseRecorder {
  isRecording: boolean
  elapsedSeconds: number
  error: string | null
  /** 녹음 중인 마이크 스트림 (VU 미터 레벨 분석용). 미녹음 시 null */
  stream: MediaStream | null
  start: () => Promise<void>
  stop: () => Promise<RecordingResult | null>
  cancel: () => void
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

export function useRecorder(): UseRecorder {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const tickRef = useRef<number | null>(null)
  const pendingRef = useRef<((r: RecordingResult | null) => void) | null>(null)

  const cleanup = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStream(null)
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const start = useCallback(async () => {
    if (isRecording) return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setStream(stream)
      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        const cb = pendingRef.current
        pendingRef.current = null
        cleanup()
        setIsRecording(false)
        setElapsedSeconds(0)
        cb?.({ blob, durationSeconds, mimeType: type })
      }
      startTimeRef.current = Date.now()
      recorder.start()
      setIsRecording(true)
      setElapsedSeconds(0)
      tickRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 250)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Recording failed'
      setError(msg)
      cleanup()
      setIsRecording(false)
      throw e
    }
  }, [isRecording, cleanup])

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      pendingRef.current = resolve
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      pendingRef.current = null
      try {
        recorder.stop()
      } catch {
        // ignore
      }
    }
    cleanup()
    setIsRecording(false)
    setElapsedSeconds(0)
  }, [cleanup])

  return { isRecording, elapsedSeconds, error, stream, start, stop, cancel }
}
