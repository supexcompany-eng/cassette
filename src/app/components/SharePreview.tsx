import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTapePlayback } from '../../hooks/useTapePlayback'
import CassetteDeck from './CassetteDeck'
import NoteCard from './NoteCard'
import { useBlockSwipeBack } from '../../lib/swipeNav'
import type { NoteValues } from './NoteComposeSheet'
import type { Segment, Tape } from '../../lib/types'

// 미리보기 = 플레이어와 동일: 데크는 폭(320~430) 스케일로 상단 고정, 쪽지는 아래로 스크롤.
// 보내기/쪽지수정 버튼은 하단 고정 바로 분리(스케일/스크롤 영향 없음 → 항상 보임). (Figma 230:9329)
const MEMO_TOP = 524 // 데크 아래 쪽지 시작 y
const NOTE_H = 180 // NoteCard(bg_memo 393×180) 자연 높이
const DECK_BOTTOM = 544 // 데크 시각 바닥 y (마스크 위치 기준, 쪽지와 20 overlap)

function today(): string {
  const d = new Date()
  return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

interface SharePreviewProps {
  tape: Tape
  segments: Segment[]
  values: NoteValues
  onClose: () => void
  onEditNote: () => void
  onSend: () => void
  sending?: boolean
}

/** 미리보기 — 상대에게 보일 모습. 플레이어와 동일한 데크 + 쪽지(풀폭) + [쪽지수정]/[보내기]. */
export default function SharePreview({ tape, segments, values, onClose, onEditNote, onSend, sending }: SharePreviewProps) {
  const playback = useTapePlayback(segments)
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useBlockSwipeBack(true) // 풀팝업(닫기 버튼만) — 가장자리 뒤로가기 막음

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setScale(Math.max(320, Math.min(el.clientWidth, 430)) / 393)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 z-[60] bg-[#f5f3f1]">
      {/* 스크롤(z-0): 쪽지가 데크 아래로 스크롤 (내 카세트와 동일 정책). 버튼은 하단 고정 */}
      <div
        className="absolute inset-0 z-0 overflow-y-auto overflow-x-hidden [overscroll-behavior:none]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}
      >
        <div style={{ paddingTop: MEMO_TOP * scale }}>
          <div className="relative mx-auto" style={{ width: 393 * scale, height: NOTE_H * scale }}>
            <div
              className="absolute left-0 top-0"
              style={{ width: 393, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              <NoteCard toName={values.to} note={values.note} fromName={values.from} date={today()} />
            </div>
          </div>
        </div>
      </div>

      {/* 마스크(z-10): 데크 바닥에서 쪽지가 부드럽게 사라짐 (플레이어 mask_top과 동일) */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 h-[42px] bg-gradient-to-t from-[20%] from-[rgba(245,243,241,0)] to-[70%] to-[#f5f3f1]"
        style={{ top: DECK_BOTTOM * scale - 52 }}
      />

      {/* 데크(z-20): 폭 스케일로 상단 고정. 컨트롤만 클릭 가능 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div
          className="absolute left-1/2 top-0 w-[393px]"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
        >
          <CassetteDeck tape={tape} segments={segments} playback={playback} />
        </div>
      </div>

      {/* CTA 하단 고정 — 디자인 426:15712: Mask 20px(별도) + BTN area(pt10·pb34·px20·gap10, bg #f5f3f1) */}
      <div className="absolute inset-x-0 bottom-0 z-[65]">
        {/* Mask 20px: 위 투명 → 아래 불투명(#f5f3f1), 버튼 영역 바로 위에 별도 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-[20px] bg-gradient-to-b from-[rgba(245,243,241,0)] to-[#f5f3f1]" />
        {/* BTN area: 버튼 위 10 간격 + 아래 34 */}
        <div
          className="bg-[#f5f3f1] px-[20px] pt-[10px]"
          style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-[10px]">
            <button
              type="button"
              onClick={onEditNote}
              className="flex h-[56px] flex-1 items-center justify-center rounded-[8px] bg-[#222]"
            >
              <span className="font-['Orbit'] text-[18px] leading-[25.5px] text-white">쪽지수정</span>
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={sending}
              className="flex h-[56px] flex-1 items-center justify-center rounded-[8px] bg-[#222] disabled:opacity-60"
            >
              <span className="font-['Orbit'] text-[18px] leading-[25.5px] text-white">{sending ? '여는 중…' : '보내기'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 헤더 (safe-area 고정, 최상위) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[70]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="pointer-events-auto flex h-[64px] items-center px-[16px]">
        <div className="size-[40px] shrink-0" aria-hidden />
        <p className="min-w-px flex-1 text-center font-['Orbit'] text-[20px] leading-[32px] text-[#111]">미리보기</p>
        <button
          type="button"
          onClick={onClose}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="닫기"
        >
          <X className="size-[24px] text-[#111]" strokeWidth={2} />
        </button>
      </header>
      </div>
    </div>
  )
}
