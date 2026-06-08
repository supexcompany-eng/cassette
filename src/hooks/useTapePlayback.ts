import { useCallback, useRef, useState } from 'react'
import { usePlayer } from './usePlayer'
import { getAudioUrl } from '../lib/storage'
import type { Segment } from '../lib/types'

/**
 * 공유 미리보기·랜딩 페이지용 재생 훅 (녹음 없음).
 * 선택 구간부터 끝까지 순차 재생 + VU용 analyser 제공.
 */
export function useTapePlayback(segments: Segment[]) {
  const player = usePlayer()
  const [currentIndex, setCurrentIndex] = useState(0)
  const stopRef = useRef(false)

  const playFrom = useCallback(
    (startIndex: number) => {
      stopRef.current = false
      const playable = segments.filter((s) => s.audio_path)
      if (playable.length === 0) return
      const startId = segments[startIndex]?.id
      let i = Math.max(
        0,
        playable.findIndex((s) => s.id === startId),
      )
      const playNext = () => {
        if (stopRef.current || i >= playable.length) {
          if (i >= playable.length) setCurrentIndex(0)
          return
        }
        const seg = playable[i]
        const abs = segments.findIndex((s) => s.id === seg.id)
        if (abs >= 0) setCurrentIndex(abs)
        player.play(getAudioUrl(seg.audio_path!), seg.id, () => {
          i += 1
          playNext()
        })
      }
      playNext()
    },
    [player, segments],
  )

  const stop = useCallback(() => {
    stopRef.current = true
    player.stop()
  }, [player])

  return {
    playingId: player.playingId,
    analyser: player.analyser,
    currentIndex,
    setCurrentIndex,
    playFrom,
    stop,
    isPlaying: !!player.playingId,
  }
}
