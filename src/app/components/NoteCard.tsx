import bgMemo from '../../assets/bg_memo.png'

interface NoteCardProps {
  toName: string
  note: string
  fromName: string
  /** yyyy.mm.dd */
  date: string
  className?: string
}

/**
 * 공유 쪽지 카드. bg_memo.png(786×360 = 393×180)를 393폭 풀로 깔고,
 * 텍스트는 종이 안쪽(좌20·상2 프레임 + px18 py16, gap20)에 배치. (Figma 233:16664)
 */
export default function NoteCard({ toName, note, fromName, date, className }: NoteCardProps) {
  return (
    <div className={`relative w-[393px] ${className ?? ''}`}>
      <img src={bgMemo} alt="" aria-hidden draggable={false} className="pointer-events-none block w-full select-none" />
      {/* 텍스트 프레임: 좌20 상2, 너비353, 내부 px18 py16, 항목 간 gap20 */}
      <div className="absolute left-[20px] top-[2px] flex w-[353px] flex-col gap-[20px] px-[18px] py-[16px] text-[#111]">
        <div className="flex items-center gap-[4px] whitespace-nowrap">
          <span className="font-mix text-[16px] leading-none">to.</span>
          <span className="font-['Orbit'] text-[14px] leading-none">{toName}</span>
        </div>
        <p className="h-[52px] overflow-hidden font-['Orbit'] text-[14px] leading-[26px] tracking-[-0.28px]">{note}</p>
        <div className="flex items-center justify-between whitespace-nowrap">
          <span className="font-mix text-[14px] leading-[26px] tracking-[-0.28px]">{date}</span>
          <div className="flex items-center gap-[4px]">
            <span className="font-mix text-[16px] leading-none">from.</span>
            <span className="font-['Orbit'] text-[14px] leading-none">{fromName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
