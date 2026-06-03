import { useCallback, useEffect, useRef, useState } from 'react'

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  // 재생 중인 <audio> 엘리먼트 (VU 미터 레벨 분석용). 미재생 시 null
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const play = useCallback((url: string, id: string, onEnd?: () => void) => {
    audioRef.current?.pause()
    const audio = new Audio()
    // WebAudio 분석을 위해 CORS 모드로 로드 (스토리지가 허용하면 실제 레벨 분석 가능)
    audio.crossOrigin = 'anonymous'
    audio.src = url
    audioRef.current = audio
    setPlayingId(id)
    setAudioEl(audio)
    audio.onended = () => {
      setPlayingId(null)
      setAudioEl(null)
      onEnd?.()
    }
    audio.onerror = () => {
      setPlayingId(null)
      setAudioEl(null)
    }
    void audio.play().catch(() => {
      setPlayingId(null)
      setAudioEl(null)
    })
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
    setAudioEl(null)
  }, [])

  return { play, stop, playingId, audioEl }
}
