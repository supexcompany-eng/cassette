import { useState } from 'react'
import CassetteView from './CassetteView'
import VuMeter from './VuMeter'
import PlayerControls, { type ControlType } from './PlayerControls'
import imgPlayerBody from '../../assets/img_player_body_share.png'
import imgCassetteBg from '../../assets/img_player_cassettebg.png'
import type { Segment, Tape } from '../../lib/types'
import type { useTapePlayback } from '../../hooks/useTapePlayback'

const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'
const MAX_CAPTION_LENGTH = 13

interface CassetteDeckProps {
  tape: Tape
  segments: Segment[]
  playback: ReturnType<typeof useTapePlayback>
}

/**
 * 공유 미리보기·랜딩용 카세트 데크 (393 폭 고정). 녹음 없음(REC 숨김).
 * 데크 이미지 + 카세트(릴 회전) + VU(재생 레벨) + 컨트롤(REW/STOP/PLAY/FF).
 * 위치는 플레이어(TapePage)와 동일한 데크 기준 좌표.
 */
export default function CassetteDeck({ tape, segments, playback }: CassetteDeckProps) {
  const [pressed, setPressed] = useState<ControlType | null>(null)
  const { playingId, analyser, currentIndex, setCurrentIndex, playFrom, stop, isPlaying } = playback

  const onPress = (type: ControlType) => {
    setPressed(type)
    if (type === 'play') {
      if (isPlaying) return // 이미 재생 중이면 다시 눌러도 아무 동작 안 함
      playFrom(currentIndex)
    } else if (type === 'stop') {
      stop()
    } else if (type === 'rew') {
      const next = Math.max(0, currentIndex - 1)
      setCurrentIndex(next)
      if (isPlaying) playFrom(next)
    } else if (type === 'ff') {
      const next = Math.min(Math.max(0, segments.length - 1), currentIndex + 1)
      setCurrentIndex(next)
      if (isPlaying) playFrom(next)
    }
  }

  const activeTypes: Partial<Record<ControlType, boolean>> = {
    rew: pressed === 'rew',
    stop: pressed === 'stop',
    play: !!playingId || pressed === 'play', // 재생 중이 아니어도 누르면 눌림 효과
    ff: pressed === 'ff',
  }

  const caption = tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER

  return (
    <div className="relative w-[393px] select-none">
      <img src={imgPlayerBody} alt="" aria-hidden draggable={false} className="pointer-events-none block w-full select-none" />

      {/* 카세트 창 배경 */}
      <img
        src={imgCassetteBg}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-[116px] h-[192px] w-[287px] -translate-x-1/2 select-none"
      />
      {/* 스피커 그릴은 img_player_body_share에 포함 — 별도 오버레이 없음 */}
      {/* 카세트 (릴 회전 = 재생 중) */}
      <div className="pointer-events-none absolute left-0 top-[98px] w-full">
        <CassetteView designId={tape.design} spinning={isPlaying} caption={caption.slice(0, MAX_CAPTION_LENGTH)} />
      </div>
      {/* VU */}
      <div className="absolute left-[37px] top-[331px] h-[46px] w-[82px]">
        <VuMeter playbackAnalyser={analyser} className="h-full w-full" />
      </div>
      {/* 컨트롤 (REC 없음, btn_player_share 키캡) */}
      <PlayerControls
        activeTypes={activeTypes}
        variant="share"
        playing={!!playingId}
        onPress={onPress}
        onRelease={() => setPressed(null)}
        className="pointer-events-auto absolute left-1/2 top-[381px] -translate-x-1/2"
      />
    </div>
  )
}
