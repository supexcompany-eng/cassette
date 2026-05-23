import { useState } from 'react';
import { motion } from 'motion/react';
import svgPaths from "./svg-ix5zqjos2j";

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
  const [dragX, setDragX] = useState(0);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50) {
      // 왼쪽으로 50px 이상 드래그하면 삭제 버튼 노출
      setDragX(-80);
    } else {
      // 원래 위치로
      setDragX(0);
    }
  };

  return (
    <div className="relative w-full h-[56px]" data-name="item">
      {/* 삭제 버튼 배경 */}
      <div className="absolute bg-[#c4383f] h-[56px] right-0 rounded-[8px] top-0 w-[80px] flex items-center justify-center">
        <button
          onClick={() => {
            setDragX(0);
            onDelete?.();
          }}
          className="overflow-clip size-[20px]"
          data-name="icon_delete"
        >
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
            <g id="Frame 11">
              <path d="M3.75 6.11109H16.25" id="Vector" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              <path d={svgPaths.p367ae600} id="Vector_2" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              <path d={svgPaths.p3c9f0140} id="Vector_3" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              <path d="M8.61112 9.58333V13.75" id="Vector_4" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              <path d="M11.3889 9.58333V13.75" id="Vector_5" stroke="#E1E1E1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </g>
          </svg>
        </button>
      </div>

      {/* 드래그 가능한 아이템 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute bg-[#1c1c1c] flex gap-[12px] h-[56px] items-center left-0 px-[17px] py-px rounded-[8px] top-0 w-full cursor-grab active:cursor-grabbing"
        data-name="item"
      >
        <div aria-hidden="true" className="absolute border border-[#2a2a2a] border-solid inset-0 pointer-events-none rounded-[8px]" />
        <span className="text-[#888] text-[14px] font-['Sometype_Mono',sans-serif] leading-[20px] w-[10px] shrink-0">{count}</span>
        <input
          type="text"
          value={message}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 bg-transparent text-[#E1E1E1] text-[14px] font-['MaruBuriExtraLight',sans-serif] leading-normal outline-none placeholder-[#515151]"
          placeholder="메시지 적기"
        />
        <span className="text-[#888] text-[12px] font-['Sometype_Mono',sans-serif] leading-normal text-right shrink-0">{duration}</span>
      </motion.div>
    </div>
  );
}
