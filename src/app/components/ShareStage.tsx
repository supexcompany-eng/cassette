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
  /** 헤더 우측 아이콘 버튼 (랜딩/받기 — 다운로드/보관/삭제). onClose 없을 때 사용 */
  rightIcon?: string
  onRightClick?: () => void
  rightDisabled?: boolean
  /** 헤더 좌측 아이콘 버튼 (받기 화면 — 뒤로) */
  leftIcon?: string
  onLeftClick?: () => void
  /** 스테이지 내부 헤더 숨김 (헤더를 스케일 밖에서 따로 그릴 때 — 받기 화면) */
  hideHeader?: boolean
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
  rightIcon,
  onRightClick,
  rightDisabled,
  leftIcon,
  onLeftClick,
  hideHeader,
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
      <div className={`absolute inset-x-0 top-0 z-10 flex h-[64px] items-center px-[16px] ${hideHeader ? 'hidden' : ''}`}>
        {leftIcon ? (
          <button
            type="button"
            onClick={onLeftClick}
            className="flex size-[40px] shrink-0 items-center justify-center"
            aria-label="뒤로"
          >
            <img src={leftIcon} alt="" className="size-[24px]" aria-hidden />
          </button>
        ) : (
          <div className="size-[40px] shrink-0" aria-hidden />
        )}
        <p className="min-w-px flex-1 text-center font-mix text-[20px] font-medium leading-[32px] text-[#111]">{headerText}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-[40px] shrink-0 items-center justify-center"
            aria-label="닫기"
          >
            <X className="size-[24px] text-[#111]" strokeWidth={2} />
          </button>
        ) : rightIcon ? (
          <button
            type="button"
            onClick={onRightClick}
            disabled={rightDisabled}
            className="flex size-[40px] shrink-0 items-center justify-center disabled:opacity-40"
            aria-label="보관"
          >
            <img src={rightIcon} alt="" className="size-[24px]" aria-hidden />
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
