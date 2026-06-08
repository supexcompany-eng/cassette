import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import CassetteDeck from './CassetteDeck'
import NoteCard from './NoteCard'
import type { Segment, Tape } from '../../lib/types'
import type { useTapePlayback } from '../../hooks/useTapePlayback'

interface ShareStageProps {
  tape: Tape
  segments: Segment[]
  playback: ReturnType<typeof useTapePlayback>
  headerText: string
  /** 있으면 헤더 우측에 X(닫기) (미리보기). 없으면 워드마크만 (랜딩) */
  onClose?: () => void
  toName: string
  note: string
  fromName: string
  /** yyyy.mm.dd */
  date: string
  /** 스테이지 크기/오프셋 (미리보기=852/deck0/memo524, 랜딩=650/deck-44/memo460) */
  width: number
  height: number
  deckTop: number
  memoTop: number
  /** 하단 고정 영역 (미리보기 CTA) */
  footer?: ReactNode
}

/** 공유 스테이지: 헤더 + 카세트 데크 + 쪽지 카드. 미리보기/랜딩 공용(치수는 props). */
export default function ShareStage({
  tape,
  segments,
  playback,
  headerText,
  onClose,
  toName,
  note,
  fromName,
  date,
  width,
  height,
  deckTop,
  memoTop,
  footer,
}: ShareStageProps) {
  return (
    <div className="relative shrink-0" style={{ width, height }}>
      {/* 헤더 */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-[64px] items-center px-[16px]">
        <div className="size-[40px] shrink-0" aria-hidden />
        <p className="min-w-px flex-1 text-center font-mix text-[20px] leading-[32px] text-[#111]">{headerText}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-[40px] shrink-0 items-center justify-center"
            aria-label="닫기"
          >
            <X className="size-[24px] text-[#111]" strokeWidth={2} />
          </button>
        ) : (
          <div className="size-[40px] shrink-0" aria-hidden />
        )}
      </div>

      {/* 데크 (플레이어와 동일 좌표: 카세트는 데크 기준 top98) */}
      <div className="absolute left-0" style={{ top: deckTop }}>
        <CassetteDeck tape={tape} segments={segments} playback={playback} />
      </div>

      {/* 쪽지 카드 (393 풀폭) */}
      <div className="absolute left-0" style={{ top: memoTop }}>
        <NoteCard toName={toName} note={note} fromName={fromName} date={date} />
      </div>

      {footer ? <div className="absolute inset-x-0 bottom-0">{footer}</div> : null}
    </div>
  )
}
