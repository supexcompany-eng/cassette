import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, PanInfo } from 'motion/react';
import svgPaths from "./svg-9gigkh5yw3";

type ItemProps = {
  count?: string;
  message?: string;
  duration?: string;
  isFocused?: boolean;
  onDelete?: () => void;
  onChange?: (value: string) => void;
  onTap?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSwipeStart?: () => void;
  onLongPress?: (event: PointerEvent) => void;
};

export default function Item({
  count = "1",
  message = "메모 적기",
  duration = "00:02",
  isFocused = false,
  onDelete,
  onChange,
  onTap,
  onOpenChange,
  onSwipeStart,
  onLongPress,
}: ItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const x = useMotionValue(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressEventRef = useRef<PointerEvent | null>(null);

  const DELETE_WIDTH = 55;
  const OPEN_THRESHOLD = -DELETE_WIDTH / 2;
  const VELOCITY_THRESHOLD = -500;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (isOpen && itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < OPEN_THRESHOLD || velocity < VELOCITY_THRESHOLD) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleItemClick = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    onTap?.();
  };

  const bgClass = isReordering
    ? 'bg-[#1c1c1c]'
    : isFocused
      ? 'bg-[#252525]'
      : 'bg-[#1c1c1c]';

  return (
    <div
      ref={itemRef}
      className="relative w-full h-[56px] overflow-hidden"
      data-name="item"
      data-segment-item="true"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT') return;
        if (isOpen) return;
        longPressEventRef.current = e.nativeEvent;
        longPressTimer.current = setTimeout(() => {
          setIsReordering(true);
          if (longPressEventRef.current) {
            onLongPress?.(longPressEventRef.current);
          }
        }, 500);
      }}
      onPointerUp={() => {
        cancelLongPress();
        setIsReordering(false);
      }}
      onPointerCancel={() => {
        cancelLongPress();
        setIsReordering(false);
      }}
    >
      {/* 삭제 버튼 배경 */}
      <div className="-translate-y-1/2 absolute right-[20px] size-[40px] top-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="relative size-[40px] flex items-center justify-center"
        >
          <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 40 40">
            <circle cx="20" cy="20" fill="#C4383F" r="20" />
          </svg>
          <div className="absolute -translate-y-1/2 overflow-clip right-[10px] size-[20px] top-1/2 z-10">
            <svg className="block size-full" fill="none" viewBox="0 0 20 20">
              <g>
                <path d="M3.75 6.11109H16.25" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
                <path d={svgPaths.p367ae600} stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
                <path d={svgPaths.p3c9f0140} stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
                <path d="M8.61112 9.58333V13.75" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
                <path d="M11.3889 9.58333V13.75" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              </g>
            </svg>
          </div>
        </button>
      </div>

      {/* 드래그 가능한 아이템 */}
      <motion.div
        drag={isReordering ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.5 }}
        dragMomentum={false}
        onDragStart={() => {
          cancelLongPress();
          onSwipeStart?.();
        }}
        onDragEnd={handleDragEnd}
        onClick={handleItemClick}
        animate={{ x: isOpen ? -DELETE_WIDTH : 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 40,
          mass: 0.8
        }}
        style={{ x }}
        className={`absolute ${bgClass} flex gap-[12px] h-[56px] items-center left-[20px] right-[20px] px-[17px] py-px rounded-[8px] top-0 touch-pan-y`}
      >
        <motion.div
          aria-hidden="true"
          className="absolute border border-solid inset-0 pointer-events-none rounded-[8px]"
          animate={{ borderColor: isReordering ? '#888888' : '#2a2a2a' }}
          transition={{ duration: 0 }}
        />
        <span className="text-[#888] text-[14px] font-['Sometype_Mono',sans-serif] leading-[20px] w-[10px] shrink-0">{count}</span>
        <input
          type="text"
          value={message}
          maxLength={15}
          onChange={(e) => onChange?.(e.target.value.slice(0, 15))}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="bg-transparent text-[#E1E1E1] text-[14px] font-['MaruBuriExtraLight',sans-serif] leading-normal outline-none placeholder-[#515151] [field-sizing:content] min-w-[20px] max-w-full"
          placeholder="메시지 적기"
        />
        <div className="flex-1" aria-hidden />
        <span className="text-[#888] text-[12px] font-['Sometype_Mono',sans-serif] leading-normal text-right shrink-0">{duration}</span>
      </motion.div>
    </div>
  );
}
