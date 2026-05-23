import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, PanInfo } from 'motion/react';
import svgPaths from "./svg-9gigkh5yw3";

type ItemProps = {
  count?: string;
  message?: string;
  duration?: string;
  onDelete?: () => void;
  onChange?: (value: string) => void;
};

export default function Item({
  count = "1",
  message = "메모 적기",
  duration = "00:02",
  onDelete,
  onChange
}: ItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const x = useMotionValue(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 삭제 버튼 너비
  const DELETE_WIDTH = 55;

  // 스와이프 threshold
  const OPEN_THRESHOLD = -30;

  // 외부 클릭 감지
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

  // 타이머 클린업
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // 빠르게 스와이프하거나 threshold 넘으면 열기
    if (offset < OPEN_THRESHOLD || velocity < -500) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleItemClick = () => {
    if (isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={itemRef}
      className="relative w-full h-[56px] overflow-hidden"
      data-name="item"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT') {
          longPressTimer.current = setTimeout(() => {
            setIsReordering(true);
          }, 500);
        }
      }}
      onPointerUp={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setIsReordering(false);
      }}
      onPointerCancel={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setIsReordering(false);
      }}
    >
      {/* 삭제 버튼 배경 */}
      <div className="-translate-y-1/2 absolute right-px size-[40px] top-1/2">
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
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={{ left: 0.2, right: 0.5 }}
        dragMomentum={false}
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
        className="absolute bg-[#1c1c1c] flex gap-[12px] h-[56px] items-center left-0 px-[17px] py-px rounded-[8px] top-0 w-[353px] touch-pan-y"
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
          onChange={(e) => onChange?.(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-[#E1E1E1] text-[14px] font-['MaruBuriExtraLight',sans-serif] leading-normal outline-none placeholder-[#515151]"
          placeholder="메시지 적기"
        />
        <span className="text-[#888] text-[12px] font-['Sometype_Mono',sans-serif] leading-normal text-right shrink-0">{duration}</span>
      </motion.div>
    </div>
  );
}
