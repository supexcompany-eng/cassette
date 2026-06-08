import { useState } from 'react'
import { X } from 'lucide-react'
import CassetteView from './CassetteView'

export interface NoteValues {
  to: string
  note: string
  from: string
}

const TO_MAX = 20
const FROM_MAX = 20
const NOTE_MAX = 50
const CAPTION_PLACEHOLDER = '카세트명이 노출됩니다'

interface NoteComposeSheetProps {
  designId: string
  caption: string
  segmentCount: number
  durationText: string
  initial: NoteValues
  /** compose = 첫 작성(CTA 미리보기) / edit = 미리보기에서 수정(CTA 저장) */
  mode: 'compose' | 'edit'
  onClose: () => void
  onSubmit: (v: NoteValues) => void
}

export default function NoteComposeSheet({
  designId,
  caption,
  segmentCount,
  durationText,
  initial,
  mode,
  onClose,
  onSubmit,
}: NoteComposeSheetProps) {
  const [to, setTo] = useState(initial.to)
  const [note, setNote] = useState(initial.note)
  const [from, setFrom] = useState(initial.from)

  const allFilled = to.trim().length > 0 && note.trim().length > 0 && from.trim().length > 0
  const changed = to !== initial.to || note !== initial.note || from !== initial.from
  const canSubmit = mode === 'edit' ? allFilled && changed : allFilled

  const submit = () => {
    if (!canSubmit) return
    onSubmit({ to: to.trim(), note: note.trim(), from: from.trim() })
  }

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-[#f5f3f1]">
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 헤더 */}
      <header className="flex h-[64px] shrink-0 items-center gap-[10px] px-[16px]">
        <div className="size-[40px] shrink-0" aria-hidden />
        <p className="min-w-px flex-1 text-center font-['Orbit'] text-[20px] leading-[32px] text-[#111]">쪽지 보내기</p>
        <button
          type="button"
          onClick={onClose}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="닫기"
        >
          <X className="size-[24px] text-[#111]" strokeWidth={2} />
        </button>
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 썸네일(카세트 크리에이트 이미지) + 요약 */}
        <div className="mt-[20px] flex flex-col items-center gap-[14px] px-[20px]">
          <div className="w-[220px]">
            <CassetteView designId={designId} light caption={caption.slice(0, 13)} />
          </div>
          <div className="flex w-full flex-col items-center gap-[6px]">
            <p className="text-center font-['Orbit'] text-[18px] leading-[28px] text-[#222]">
              {caption.trim() ? caption : CAPTION_PLACEHOLDER}
            </p>
            <div className="flex items-center gap-[6px]">
              <p className="font-mix text-[14px] leading-[20px] text-[#888]">{segmentCount}구간</p>
              <span className="h-[13px] w-px bg-[#c4c4c4]" />
              <p className="font-mix text-[14px] leading-[20px] text-[#888]">{durationText}</p>
            </div>
          </div>
        </div>

        {/* 입력 3개 */}
        <div className="mt-[40px] flex flex-col gap-[20px] px-[20px] pb-[20px]">
          <input
            type="text"
            value={to}
            maxLength={TO_MAX}
            onChange={(e) => setTo(e.target.value.slice(0, TO_MAX))}
            placeholder="받으시는 분 이름을 써주세요"
            className="w-full rounded-[8px] bg-white px-[14px] py-[16px] font-['Orbit'] text-[16px] leading-[26px] text-[#111] outline-none placeholder:text-[#b3aea6]"
          />
          <div className="flex flex-col gap-[10px] rounded-[8px] bg-white px-[14px] py-[16px]">
            <p className="font-['Orbit'] text-[12px] text-[#111]">쪽지 내용</p>
            <textarea
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="간단한 쪽지를 남겨보세요"
              rows={3}
              className="min-h-[78px] w-full resize-none bg-transparent font-['Orbit'] text-[16px] leading-[26px] text-[#111] outline-none placeholder:text-[#b3aea6]"
            />
          </div>
          <input
            type="text"
            value={from}
            maxLength={FROM_MAX}
            onChange={(e) => setFrom(e.target.value.slice(0, FROM_MAX))}
            placeholder="보내시는 분 이름을 써주세요"
            className="w-full rounded-[8px] bg-white px-[14px] py-[16px] font-['Orbit'] text-[16px] leading-[26px] text-[#111] outline-none placeholder:text-[#b3aea6]"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="shrink-0 px-[20px] pt-[20px]" style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className={`flex h-[56px] w-full items-center justify-center rounded-[8px] ${canSubmit ? 'bg-[#222]' : 'bg-[#bdb8b0]'}`}
        >
          <span className="font-['Orbit'] text-[18px] leading-[25.5px] text-white">
            {mode === 'edit' ? '저장' : '미리보기'}
          </span>
        </button>
      </div>
    </div>
  )
}
