import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { deleteTape, listTapesWithStats } from '../../lib/db'
import type { TapeWithStats } from '../../lib/types'
import MobileFrame from '../components/MobileFrame'
import icStack from '../../assets/ic_stack.svg'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

/** 문구 미입력 시 보여줄 테이프명 (재생화면 카세트 라벨과 동일) */
const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}분 ${s}초`
}

/** 헤더 좌측 스택 아이콘 (에셋) */
function StackIcon() {
  return <img src={icStack} alt="" className="size-[24px]" aria-hidden />
}

/** 헤더 우측 + 아이콘 */
function PlusIcon() {
  return (
    <div className="relative size-[24px]" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[17px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-[#111]" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-[17px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-[#111]" />
    </div>
  )
}

interface TapeRowProps {
  tape: TapeWithStats
  isOpen: boolean
  hasOpenRow: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
  onDelete: () => void
}

const REVEAL_X = -70 // 삭제 버튼(40, 우측 마진 20) + 여백 10px 노출
const SWIPE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }
const SWIPE_VELOCITY_THRESHOLD = -500

function TapeRow({ tape, isOpen, hasOpenRow, onOpenChange, onNavigate, onDelete }: TapeRowProps) {
  const x = useMotionValue(0)
  const draggedRef = useRef(false)
  const caption = tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER

  useEffect(() => {
    const controls = animate(x, isOpen ? REVEAL_X : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  return (
    <div className="relative h-[90px] w-full overflow-hidden" data-tape-row>
      {/* 삭제 버튼 (스와이프 시 노출) — 우측 마진 20px, #F54C4C */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-[20px] top-1/2 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-[#F54C4C]"
        aria-label="delete tape"
      >
        <Trash2 className="size-[20px] text-white" strokeWidth={1.5} />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: REVEAL_X, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.5 }}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => {
          draggedRef.current = true
        }}
        onDragEnd={(_, info) => {
          const moved = Math.abs(info.offset.x) > 5
          const next = info.offset.x < REVEAL_X / 2 || info.velocity.x < SWIPE_VELOCITY_THRESHOLD
          // 놓는 즉시 항상 완전히 열림/닫힘으로 스냅 (iOS 기본 동작 — 중간 상태 없음)
          animate(x, next ? REVEAL_X : 0, SWIPE_SPRING)
          onOpenChange(next)
          if (!moved) draggedRef.current = false
        }}
        onTap={() => {
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          if (isOpen) {
            onOpenChange(false)
            return
          }
          if (hasOpenRow) {
            onOpenChange(false)
            return
          }
          onNavigate()
        }}
        className="absolute inset-0 flex cursor-pointer flex-col justify-center gap-[6px] bg-[#f5f3f1] px-[24px] py-[18px]"
      >
        <p className="w-full truncate font-mix text-[16px] leading-[28px] text-[#111]">{caption}</p>
        <div className="flex w-full items-center justify-between gap-[10px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">{tape.segment_count}구간</p>
            <div className="h-[10px] w-px bg-[#cbc6bd]" />
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
              {formatDuration(tape.total_duration_seconds)}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
            {formatDate(tape.created_at)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function TapeListPage() {
  const navigate = useNavigate()
  const [tapes, setTapes] = useState<TapeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!openId) return
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('[data-tape-row]')) return
      setOpenId(null)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [openId])

  useEffect(() => {
    let cancelled = false
    listTapesWithStats()
      .then((t) => {
        if (!cancelled) setTapes(t)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      await deleteTape(id)
      setTapes((prev) => prev.filter((t) => t.id !== id))
      setOpenId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      {/* 시스템 상태바 자리 (safe-area) — 앱에선 실제 상태바가 이 자리에 노출 */}
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 헤더 (Figma title: px-16 py-12, h64) */}
      <div className="flex h-[64px] shrink-0 items-center gap-[10px] px-[16px]">
        <div className="flex size-[40px] shrink-0 items-center justify-center">
          <StackIcon />
        </div>
        <p className="min-w-px flex-1 text-center font-mix text-[20px] leading-[32px] text-[#111]">cassette</p>
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="새 테이프"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden [overscroll-behavior:none]">
        {loading && <p className="mt-[20px] px-[24px] font-mix text-[13px] text-[#888]">loading...</p>}
        {error && <p className="mt-[12px] px-[24px] font-mix text-[12px] text-[#F54C4C]">{error}</p>}
        {!loading && tapes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-[12px] px-[24px] pt-[80px] text-center">
            <p className="font-mix text-[14px] text-[#888]">아직 녹음한 테이프가 없어요</p>
            <p className="font-mix text-[12px] text-[#b3aea6]">위에서 새 테이프를 만들어 보세요</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {tapes.map((tape) => (
            <TapeRow
              key={tape.id}
              tape={tape}
              isOpen={openId === tape.id}
              hasOpenRow={openId !== null}
              onOpenChange={(open) => setOpenId(open ? tape.id : null)}
              onNavigate={() => navigate(`/tape/${tape.id}`)}
              onDelete={() => setConfirmDeleteId(tape.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom)' }} />

      {/* ===== 삭제 확인 다이얼로그 (z-50) — 재생/편집 화면과 통일 ===== */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmDeleteId(null)}
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
                삭제된 내용은 복구할 수 없습니다
                <br />
                정말 삭제하시겠습니까?
              </p>
              <div className="mt-[8px] flex border-t border-[#ececec]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <div className="w-px bg-[#ececec]" />
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  )
}
