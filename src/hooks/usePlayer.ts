import { useCallback, useEffect, useRef, useState } from 'react'
import { getSharedAudioContext } from '../lib/audioContext'

/**
 * 오디오 재생 + VU 분석용 훅.
 *
 * iOS WKWebView는 <audio>를 WebAudio(MediaElementSource)로 연결해도 AnalyserNode에 신호가 안 흐른다.
 * → fetch → decodeAudioData → AudioBufferSourceNode 로 직접 재생(iOS에서도 VU 동작). 실패 시 <audio> 폴백.
 *
 * 정지 지점부터 이어듣기: play(url,id,onEnd,offset)로 임의 위치에서 시작 가능하고,
 * currentTime()으로 현재 구간의 재생 위치(초)를 읽어 STOP 시 기록 → PLAY 시 그 위치부터 재개.
 */
export function usePlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const fallbackElRef = useRef<HTMLAudioElement | null>(null)
  const tokenRef = useRef(0)
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map()) // url→디코딩 버퍼 캐시
  // 현재 재생 위치 계산용: 시작 시점 ctx 시간 + 시작 오프셋 + 길이
  const startInfoRef = useRef<{ ctxTime: number; offset: number; duration: number } | null>(null)

  const getCtx = () => {
    ctxRef.current = getSharedAudioContext()
    return ctxRef.current
  }

  const ensureAnalyser = (ctx: AudioContext) => {
    if (!analyserRef.current) {
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      an.smoothingTimeConstant = 0.6
      an.connect(ctx.destination)
      analyserRef.current = an
    }
    return analyserRef.current
  }

  const stopInternal = () => {
    tokenRef.current++
    startInfoRef.current = null
    if (srcRef.current) {
      try {
        srcRef.current.onended = null
        srcRef.current.stop()
      } catch {
        // ignore
      }
      try {
        srcRef.current.disconnect()
      } catch {
        // ignore
      }
      srcRef.current = null
    }
    if (fallbackElRef.current) {
      fallbackElRef.current.pause()
      fallbackElRef.current.onended = null
      fallbackElRef.current.onerror = null
      fallbackElRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopInternal()
      // 공유 컨텍스트는 close하지 않는다. 이 훅이 만든 analyser만 분리.
      try {
        analyserRef.current?.disconnect()
      } catch {
        // ignore
      }
      analyserRef.current = null
      ctxRef.current = null
    }
  }, [])

  // HTMLAudio 폴백 (WebAudio 디코딩 불가 시 — 소리만, VU 없음)
  const playFallback = (url: string, id: string, myToken: number, onEnd: (() => void) | undefined, offset: number) => {
    if (tokenRef.current !== myToken) return
    const audio = new Audio()
    audio.src = url
    fallbackElRef.current = audio
    setPlayingId(id)
    setAnalyser(null)
    if (offset > 0) {
      audio.addEventListener(
        'loadedmetadata',
        () => {
          try {
            audio.currentTime = offset
          } catch {
            // ignore
          }
        },
        { once: true },
      )
    }
    audio.onended = () => {
      if (tokenRef.current !== myToken) return
      fallbackElRef.current = null
      setPlayingId(null)
      onEnd?.()
    }
    audio.onerror = () => {
      if (tokenRef.current !== myToken) return
      fallbackElRef.current = null
      setPlayingId(null)
    }
    void audio.play().catch(() => {
      if (tokenRef.current !== myToken) return
      fallbackElRef.current = null
      setPlayingId(null)
    })
  }

  const play = useCallback((url: string, id: string, onEnd?: () => void, offset = 0) => {
    stopInternal()
    const myToken = tokenRef.current
    const ctx = getCtx()
    void ctx.resume()
    setPlayingId(id)
    setAnalyser(null)

    const cached = bufferCacheRef.current.get(url)
    const bufferP = cached
      ? Promise.resolve(cached)
      : fetch(url, { mode: 'cors' })
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .then((buf) => {
            bufferCacheRef.current.set(url, buf)
            return buf
          })

    bufferP
      .then((buffer) => {
        if (tokenRef.current !== myToken) return
        const an = ensureAnalyser(ctx)
        const node = ctx.createBufferSource()
        node.buffer = buffer
        node.connect(an)
        node.onended = () => {
          if (tokenRef.current !== myToken) return
          srcRef.current = null
          startInfoRef.current = null
          setPlayingId(null)
          setAnalyser(null)
          onEnd?.()
        }
        srcRef.current = node
        const safeOffset = Math.max(0, Math.min(offset, Math.max(0, buffer.duration - 0.05)))
        startInfoRef.current = { ctxTime: ctx.currentTime, offset: safeOffset, duration: buffer.duration }
        node.start(0, safeOffset)
        setAnalyser(an)
      })
      .catch(() => {
        playFallback(url, id, myToken, onEnd, offset)
      })
  }, [])

  /** 현재 재생 중인 구간의 재생 위치(초). 미재생 시 0. */
  const currentTime = useCallback(() => {
    const si = startInfoRef.current
    const ctx = ctxRef.current
    if (si && ctx) {
      return Math.max(0, Math.min(si.duration, ctx.currentTime - si.ctxTime + si.offset))
    }
    const el = fallbackElRef.current
    if (el) return el.currentTime || 0
    return 0
  }, [])

  const stop = useCallback(() => {
    stopInternal()
    setPlayingId(null)
    setAnalyser(null)
  }, [])

  return { play, stop, playingId, analyser, currentTime }
}
