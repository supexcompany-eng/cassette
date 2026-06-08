import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createTape, getTape, updateTape } from '../../lib/db'
import { CASSETTE_DESIGNS } from '../../lib/cassetteDesigns'
import MobileFrame from '../components/MobileFrame'
import CassetteView from '../components/CassetteView'
import imgShadow from '../../assets/img_shadow_create.png'

const MAX_CAPTION_LENGTH = 13 // 카세트 이름 최대 13자 (공백도 1자로 카운트)
const CASSETTE_W = 275 // 카세트 너비 (Figma 캐러셀 중앙 카세트 기준)
const SWIPE_THRESHOLD = 40 // 한 칸 넘기는 데 필요한 드래그 px
// Figma 구조: 314×246 박스(회전한 카세트의 AABB) 안에 275 카세트를 가운데 정렬 후 회전.
const BOX_W = 314.054
const BOX_H = 246.696
// 휠(원호) 모션 — 화면 아래 한 점을 축으로 박스를 회전시켜 카세트가 원을 따라 돌게 함.
// 한 칸당 STEP°만큼 축을 중심으로 회전 → 위치(원호 이동)와 카세트 기울기가 동시에 결정.
const STEP = 20 // 한 칸당 회전각 = 양옆 카세트 기울기(deg)
// 모든 박스는 가운데 슬롯 위치에 깔고 transform: rotate(diff*STEP)만 줌 (축은 box 좌상단 기준 px)
const CENTER_LEFT = 39.47 // 가운데 카세트 중심 x=196.5 → 314박스 좌상단
const CENTER_TOP = 17.11 // 중심 y=422.46(화면) → 박스 top 299.11 - 캐러셀상단 282
const PIVOT_X = 157.03 // 박스 중심 x (회전축)
const PIVOT_Y = 825.1 // 박스 좌상단에서 아래로 R(≈702)+박스중심까지 = 회전축 y

export default function NewCassettePage() {
  const navigate = useNavigate()
  const { id } = useParams() // 있으면 편집(카세트 바꾸기) 모드
  const isEdit = !!id
  const [caption, setCaption] = useState('')
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false) // 편집 중 닫기 시 확인
  const dragStartXRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const originalRef = useRef<{ caption: string; design: string } | null>(null) // 편집 전 값

  const trimmed = caption.trim()
  const lastIndex = CASSETTE_DESIGNS.length - 1
  const clampIndex = (n: number) => Math.max(0, Math.min(lastIndex, n))
  const selectedId = CASSETTE_DESIGNS[selected].id
  // 편집 모드: 디자인/문구 중 하나라도 바뀌어야 저장 가능. 생성 모드: 항상 변경으로 취급
  const changed =
    !isEdit ||
    !originalRef.current ||
    trimmed !== originalRef.current.caption.trim() ||
    selectedId !== originalRef.current.design
  const canSubmit = trimmed.length > 0 && changed
  // 편집 모드에서 실제 변경이 있는지 (닫기 시 확인 여부)
  const dirty =
    isEdit &&
    !!originalRef.current &&
    (trimmed !== originalRef.current.caption.trim() || selectedId !== originalRef.current.design)
  const handleClose = () => {
    if (dirty) setDiscardOpen(true)
    else navigate(isEdit ? `/tape/${id}` : '/')
  }

  // 편집 모드: 현재 테이프 값으로 디자인/문구 미리 채우기
  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false
    getTape(id)
      .then((t) => {
        if (cancelled || !t) return
        setCaption(t.caption)
        const idx = CASSETTE_DESIGNS.findIndex((d) => d.id === t.design)
        setSelected(idx >= 0 ? idx : 0)
        originalRef.current = { caption: t.caption, design: t.design }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isEdit, id])

  const onPointerDown = (e: { clientX: number }) => {
    dragStartXRef.current = e.clientX
    draggedRef.current = false
  }
  const endDrag = (e: { clientX: number }) => {
    if (dragStartXRef.current == null) return
    const dx = e.clientX - dragStartXRef.current
    dragStartXRef.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    draggedRef.current = true
    // 스와이프 한 번 = 한 칸. 좌로 밀면 다음, 우로 밀면 이전
    setSelected((s) => clampIndex(s + (dx < 0 ? 1 : -1)))
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = { caption: trimmed.slice(0, MAX_CAPTION_LENGTH), design: selectedId }
      if (isEdit && id) {
        await updateTape(id, payload)
        navigate(`/tape/${id}`)
      } else {
        const tape = await createTape(payload)
        navigate(`/tape/${tape.id}`)
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : isEdit
              ? '저장하지 못했어요'
              : '카세트를 만들지 못했어요'
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      {/* 시스템 상태바 자리 */}
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 헤더: 제목 / 닫기 */}
      <header className="flex h-[64px] shrink-0 items-center gap-[10px] px-[16px]">
        <div className="size-[40px] shrink-0" aria-hidden />
        <p className="min-w-px flex-1 text-center font-mix text-[20px] leading-[32px] text-[#111]">
          {isEdit ? 'Edit cassette' : 'New cassette'}
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="닫기"
        >
          <X className="size-[24px] text-[#111]" strokeWidth={2} />
        </button>
      </header>

      {/* 가이드 + 문구 인풋 (Figma: 헤더 아래 80px, y188) */}
      <div className="mt-[80px] flex shrink-0 flex-col items-center gap-[4px] px-[24px] py-[10px]">
        <p className="w-full text-center font-['Orbit'] text-[14px] text-[#111]">어떤 카세트인가요?</p>
        <div className="relative h-[50px] w-full">
          <input
            type="text"
            value={caption}
            maxLength={MAX_CAPTION_LENGTH}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="h-full w-full bg-transparent text-center font-['Orbit'] text-[22px] text-[#111] caret-[#111] outline-none"
          />
          {/* 가이드 텍스트: 포커스 안 됐고 비어있을 때만 노출 (탭=포커스 시 사라지고 커서 노출) */}
          {!focused && !caption ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-['Orbit'] text-[22px] text-[#c4c4c4]">
              순간을 기억할 문장을 적어주세요
            </p>
          ) : null}
        </div>
      </div>

      {/* 카세트 캐러셀 — 한 번 스와이프에 한 장씩. 가운데=직립, 좌 -20°/우 +20°, 가장자리에 잘림 */}
      <div
        className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* 카세트 뒤 드롭쉐도우 (가운데 고정, 화면 y370 = 캐러셀 top 88) */}
        <img
          src={imgShadow}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ top: 370 - 282, width: 393, zIndex: 0 }}
        />
        {CASSETTE_DESIGNS.map((d, i) => {
          const diff = i - selected
          const visible = Math.abs(diff) <= 1
          return (
            <div
              key={d.id}
              onClick={() => {
                if (draggedRef.current) return
                if (diff !== 0) setSelected(i)
              }}
              className="absolute flex items-center justify-center transition-all duration-[400ms] ease-out"
              style={{
                left: CENTER_LEFT,
                top: CENTER_TOP,
                width: BOX_W,
                height: BOX_H,
                transformOrigin: `${PIVOT_X}px ${PIVOT_Y}px`,
                transform: `rotate(${diff * STEP}deg)`, // 화면 아래 축을 중심으로 → 원호를 따라 이동+회전
                zIndex: 100 - Math.abs(diff),
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              <div className="shrink-0" style={{ width: CASSETTE_W }}>
                <CassetteView designId={d.id} caption={trimmed} light />
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 CTA "완료" — 문구 없으면 딤(비활성) */}
      <div
        className="shrink-0 bg-[#f5f3f1] px-[20px] pt-[20px]"
        style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}
      >
        {error ? <p className="mb-[10px] text-center font-mix text-[12px] text-[#F54C4C]">{error}</p> : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className={`flex h-[56px] w-full items-center justify-center rounded-[8px] ${
            canSubmit ? 'bg-[#222]' : 'bg-[#bdb8b0]'
          }`}
        >
          <span className="font-mix text-[18px] leading-[25.5px] text-white">
            {isEdit ? (saving ? '저장 중...' : '저장하기') : saving ? '만드는 중...' : '완료'}
          </span>
        </button>
      </div>

      {/* 편집 중 닫기 확인 다이얼로그 */}
      <AnimatePresence>
        {discardOpen && (
          <motion.div
            className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDiscardOpen(false)}
          >
            <motion.div
              className="w-full max-w-[300px] overflow-hidden rounded-[20px] bg-white/[0.97] pb-[6px] pt-[14px]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-[24px] py-[10px] text-center font-['Orbit'] text-[16px] leading-[28px] text-[#111]">
                변경사항은 저장되지 않습니다.
                <br />
                나가시겠습니까?
              </p>
              <div className="mt-[8px] flex">
                <button
                  type="button"
                  onClick={() => setDiscardOpen(false)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isEdit ? `/tape/${id}` : '/')}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  )
}
