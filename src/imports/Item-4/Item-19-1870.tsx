import svgPaths from "./svg-6dpkkoja2p";

function Frame() {
  return (
    <div className="-translate-y-1/2 absolute right-px size-[40px] top-1/2">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[40px] top-1/2">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
          <circle cx="20" cy="20" fill="var(--fill-0, #C4383F)" id="Ellipse 1" r="20" />
        </svg>
      </div>
      <div className="-translate-y-1/2 absolute overflow-clip right-[10px] size-[20px] top-1/2" data-name="icon_delete">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
          <g id="Frame 11">
            <path d="M3.75 6.11109H16.25" id="Vector" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path d={svgPaths.p367ae600} id="Vector_2" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path d={svgPaths.p3c9f0140} id="Vector_3" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path d="M8.61112 9.58333V13.75" id="Vector_4" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            <path d="M11.3889 9.58333V13.75" id="Vector_5" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Count() {
  return (
    <div className="h-[22px] relative shrink-0 w-[10px]" data-name="count">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="[word-break:break-word] absolute font-['Sometype_Mono:Regular',sans-serif] font-normal leading-[20px] left-[2px] text-[#888] text-[14px] top-[calc(50%-8.98px)] whitespace-nowrap">1</p>
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="h-[22px] relative shrink-0 w-[64px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="[word-break:break-word] absolute font-['Sometype_Mono:Regular',sans-serif] font-normal leading-[normal] right-[-1px] text-[#888] text-[12px] text-right top-[calc(50%-6.98px)] whitespace-nowrap">00:02</p>
      </div>
    </div>
  );
}

export default function Item() {
  return (
    <div className="relative size-full" data-name="item">
      <Frame />
      <div className="absolute bg-[#1c1c1c] content-stretch flex gap-[12px] h-[56px] items-center left-[-55px] px-[17px] py-px rounded-[8px] top-0 w-[353px]" data-name="item">
        <div aria-hidden="true" className="absolute border border-[#2a2a2a] border-solid inset-0 pointer-events-none rounded-[8px]" />
        <Count />
        <p className="[word-break:break-word] flex-[1_0_0] font-['MaruBuri:Light',sans-serif] leading-[normal] min-w-px not-italic relative text-[#515151] text-[14px]">메모 적기</p>
        <Text />
      </div>
    </div>
  );
}