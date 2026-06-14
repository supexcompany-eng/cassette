import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTapePlayback } from '../../hooks/useTapePlayback'
import CassetteDeck from './CassetteDeck'
import NoteCard from './NoteCard'
import type { NoteValues } from './NoteComposeSheet'
import type { Segment, Tape } from '../../lib/types'

// 미리보기 = 플레이어와 동일한 풀블리드 레이아웃(393 기준 width-scale, 상단 고정).
// 데크 top0(카세트 98) · 쪽지 524(풀폭) · CTA 742. (Figma 230:9329)
const MEMO_TOP = 524
const CTA_TOP = 742

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

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setScale(Math.min(el.clientWidth / 393, 1.3))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 z-[60] overflow-hidden bg-[#e7e3df]">
      {/* 393 기준 디자인을 화면 폭에 맞춰 통째로 스케일 (플레이어와 동일, 마진 없음) */}
      <div
        className="absolute left-1/2 top-0 w-[393px]"
        style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
      >
        <div className="absolute left-0 top-0">
          <CassetteDeck tape={tape} segments={segments} playback={playback} />
        </div>
        <div className="absolute left-0 w-[393px]" style={{ top: MEMO_TOP }}>
          <NoteCard toName={values.to} note={values.note} fromName={values.from} date={today()} />
        </div>
        {/* CTA: 쪽지수정 / 보내기 — 둘 다 #222 (Figma 230:9938) */}
        <div className="absolute left-0 w-[393px] px-[20px] pb-[34px] pt-[20px]" style={{ top: CTA_TOP }}>
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

      {/* 헤더 (플레이어처럼 safe-area에 고정, 스케일 영향 없음, 최상위) */}
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
