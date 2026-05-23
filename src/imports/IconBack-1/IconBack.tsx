export default function IconBack({ className }: { className?: string }) {
  return (
    <div className={className || "overflow-clip relative size-[24px]"} data-name="icon_back">
      <div className="absolute left-0 size-[24px] top-0">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
          <g id="Frame 12">
            <path d="M15 18L9 12L15 6" id="Vector" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}