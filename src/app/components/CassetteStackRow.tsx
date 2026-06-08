import { useEffect, useRef } from 'react'
import { motion, useMotionValue, animate, type PanInfo } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { getStackImage } from '../../lib/cassetteStack'
import { getDesign } from '../../lib/cassetteDesigns'
import type { TapeWithStats } from '../../lib/types'

const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'
const REVEAL_X = -54
const SWIPE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }
const SWIPE_VELOCITY_THRESHOLD = -500

interface CassetteStackRowProps {
  tape: TapeWithStats
  isOpen: boolean
  hasOpenRow: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
  onDelete: () => void
}

/** 스택 보기 행: 카세트 옆면 이미지 + 카세트명, 스와이프 삭제. (353×74) */
export default function CassetteStackRow({
  tape,
  isOpen,
  hasOpenRow,
  onOpenChange,
  onNavigate,
  onDelete,
}: CassetteStackRowProps) {
  const x = useMotionValue(0)
  const draggedRef = useRef(false)
  const caption = tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER
  const fontClass = getDesign(tape.design).label.fontClass
  const isKkubulim = fontClass.includes('Kkubulim')
  const captionSize = isKkubulim ? 18 : 16 // 꾸불림 18 / Orbit 16 (Figma)

  useEffect(() => {
    const controls = animate(x, isOpen ? REVEAL_X : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  return (
    <div className="relative h-[74px] w-full" data-tape-row>
      {/* 삭제 버튼 (스와이프 시 노출) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-0 top-1/2 z-0 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-[#F54C4C]"
        aria-label="delete tape"
      >
        <Trash2 className="size-[20px] text-white" strokeWidth={1.5} />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: REVEAL_X, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => {
          draggedRef.current = true
        }}
        onDragEnd={(_: unknown, info: PanInfo) => {
          const moved = Math.abs(info.offset.x) > 5
          const next = info.offset.x < REVEAL_X / 2 || info.velocity.x < SWIPE_VELOCITY_THRESHOLD
          animate(x, next ? REVEAL_X : 0, SWIPE_SPRING)
          onOpenChange(next)
          if (!moved) draggedRef.current = false
        }}
        onTap={() => {
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          if (isOpen || hasOpenRow) {
            onOpenChange(false)
            return
          }
          onNavigate()
        }}
        className="absolute inset-0 z-[1] cursor-pointer"
      >
        <img src={getStackImage(tape.design)} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none" />
        <p
          className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-center leading-normal text-[#111111] ${fontClass}`}
          style={{ fontSize: captionSize, WebkitTextStroke: isKkubulim ? undefined : '0.1px #111111' }}
        >
          {caption}
        </p>
      </motion.div>
    </div>
  )
}
