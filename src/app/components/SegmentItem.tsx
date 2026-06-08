import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, type PanInfo } from 'motion/react'

interface SegmentItemProps {
  segId?: string
  count: string
  message: string
  duration: string
  isFocused?: boolean
  /** 다른 항목이 포커스되어 이 항목이 흐려져야 하는 상태 */
  dimmed?: boolean
  onDelete?: () => void
  onChange?: (value: string) => void
  onTap?: () => void
  onOpenChange?: (open: boolean) => void
  /** 순서변경(롱프레스 드래그) 시작/종료 알림 — 다른 항목 dimmed 처리에 사용 */
  onReorderingChange?: (reordering: boolean) => void
  onSwipeStart?: () => void
  onLongPress?: (event: PointerEvent) => void
  /** 공유 읽기전용: 스와이프 삭제·롱프레스 순서변경·메시지 편집 비활성, 탭(선택)만 허용 */
  readOnly?: boolean
}

// 카드가 열릴 때 왼쪽으로 이동하는 거리. 삭제버튼(40, 우측 마진 20px) + 여백 10px 기준
const DELETE_WIDTH = 50
const OPEN_THRESHOLD = -DELETE_WIDTH / 2
const VELOCITY_THRESHOLD = -500
const SWIPE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }

/**
 * 재생화면 녹음 구간 리스트의 흰색 카드 항목.
 * 스와이프-삭제 / 메시지 인라인 편집 / 롱프레스 재정렬 메커니즘은 기존 다크 Item과 동일,
 * 밝은(크림) 테마로 재스타일했다. (Figma node 101:10436)
 */
export default function SegmentItem({
  segId,
  count,
  message,
  duration,
  isFocused = false,
  dimmed = false,
  onDelete,
  onChange,
  onTap,
  onOpenChange,
  onReorderingChange,
  onSwipeStart,
  onLongPress,
  readOnly = false,
}: SegmentItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const x = useMotionValue(0)
  const itemRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressEventRef = useRef<PointerEvent | null>(null)

  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  useEffect(() => {
    onReorderingChange?.(isReordering)
  }, [isReordering, onReorderingChange])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (isOpen && itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // 외부 닫힘(다른 항목 스와이프/바깥 탭 등)으로 isOpen이 바뀌면 스냅
  useEffect(() => {
    const controls = animate(x, isOpen ? -DELETE_WIDTH : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const shouldOpen = info.offset.x < OPEN_THRESHOLD || info.velocity.x < VELOCITY_THRESHOLD
    // 놓는 즉시 항상 완전히 열림/닫힘으로 스냅 (iOS 기본 동작 — 중간 상태 없음)
    animate(x, shouldOpen ? -DELETE_WIDTH : 0, SWIPE_SPRING)
    setIsOpen(shouldOpen)
  }

  const handleItemClick = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    onTap?.()
  }

  return (
    <div
      ref={itemRef}
      className={[
        'relative h-[56px] w-full rounded-[8px] transition-opacity duration-150',
        // overflow-hidden 제거 — 스와이프된 카드가 왼쪽 마진에 안 잘리고 화면 끝(스크롤 컨테이너 x0)까지 블리드되도록
        // 그림자/테두리는 흰 카드(motion.div)에 직접 적용: 순서변경=드롭쉐도우, 재생중/선택=0.5px 테두리
        dimmed ? 'opacity-70' : '',
      ].join(' ')}
      data-name="item"
      data-segment-item="true"
      data-seg-id={segId}
      onPointerDown={(e) => {
        if (readOnly) return // 읽기전용: 롱프레스 순서변경 없음
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT') return
        if (isOpen) return
        longPressEventRef.current = e.nativeEvent
        longPressTimer.current = setTimeout(() => {
          setIsReordering(true)
          if (longPressEventRef.current) onLongPress?.(longPressEventRef.current)
        }, 500)
      }}
      onPointerUp={() => {
        cancelLongPress()
        setIsReordering(false)
      }}
      onPointerCancel={() => {
        cancelLongPress()
        setIsReordering(false)
      }}
    >
      {/* 삭제 버튼 (스와이프 시 노출) — 우측 마진 20px (=아이템 오른쪽 끝, 리스트가 이미 20px inset) */}
      <div className="absolute right-0 top-1/2 size-[40px] -translate-y-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
          className="relative flex size-[40px] items-center justify-center"
          aria-label="삭제"
        >
          <span className="absolute inset-0 rounded-full bg-[#F54C4C]" />
          <svg className="relative size-[20px]" fill="none" viewBox="0 0 20 20" aria-hidden>
            <path d="M3.75 6.11109H16.25" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path
              d="M15.4167 6.11108V16.5278C15.4167 17.4483 14.6705 18.1944 13.75 18.1944H6.25C5.32953 18.1944 4.58333 17.4483 4.58333 16.5278V6.11108"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path
              d="M7.08333 6.11111V4.44444C7.08333 3.52397 7.82953 2.77777 8.75 2.77777H11.25C12.1705 2.77777 12.9167 3.52397 12.9167 4.44444V6.11111"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path d="M8.61112 9.58333V13.75" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path d="M11.3889 9.58333V13.75" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      {/* 드래그 가능한 카드 */}
      <motion.div
        drag={readOnly || isReordering ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        onDragStart={() => {
          cancelLongPress()
          onSwipeStart?.()
        }}
        onDragEnd={handleDragEnd}
        onClick={handleItemClick}
        style={{ x }}
        className={`absolute left-0 right-0 top-0 flex h-[56px] touch-pan-y items-center gap-[12px] rounded-[8px] bg-white px-[17px] ${
          isReordering
            ? 'drop-shadow-[0px_0px_8px_rgba(16,13,10,0.07)]'
            : isFocused
              ? 'border-[0.5px] border-[#868686]'
              : ''
        }`}
      >
        <span className="w-[10px] shrink-0 font-mix text-[14px] leading-[20px] text-[#888]">{count}</span>
        <input
          type="text"
          value={message}
          maxLength={15}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value.slice(0, 15))}
          onClick={(e) => !readOnly && e.stopPropagation()}
          onPointerDown={(e) => !readOnly && e.stopPropagation()}
          onTouchStart={(e) => !readOnly && e.stopPropagation()}
          placeholder={readOnly ? '' : '메시지 적기'}
          className="min-w-[20px] max-w-full bg-transparent font-mix text-[14px] leading-normal text-[#111] outline-none placeholder:text-[#b3aea6] [field-sizing:content]"
        />
        <div className="flex-1" aria-hidden />
        <span className="shrink-0 text-right font-mix text-[12px] leading-[18px] text-[#888]">{duration}</span>
      </motion.div>
    </div>
  )
}
