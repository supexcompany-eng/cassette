import { useCallback, useEffect, useRef, useState } from 'react'

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const play = useCallback((url: string, id: string, onEnd?: () => void) => {
    audioRef.current?.pause()
    const audio = new Audio(url)
    audioRef.current = audio
    setPlayingId(id)
    audio.onended = () => {
      setPlayingId(null)
      onEnd?.()
    }
    audio.onerror = () => {
      setPlayingId(null)
    }
    void audio.play().catch(() => {
      setPlayingId(null)
    })
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }, [])

  return { play, stop, playingId }
}
