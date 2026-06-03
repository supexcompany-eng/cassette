import type { ReactNode } from 'react'

interface MobileFrameProps {
  children: ReactNode
  /** 안쪽 프레임에 덧붙일 클래스 (배경/글자색 오버라이드용). 기본은 다크 테마. */
  innerClassName?: string
}

export default function MobileFrame({
  children,
  innerClassName = 'bg-[#171717] text-[#E1E1E1]',
}: MobileFrameProps) {
  return (
    <div className="min-h-dvh bg-[#000000] sm:flex sm:items-center sm:justify-center">
      <div
        className={`relative mx-auto flex w-full flex-col overflow-hidden min-h-dvh sm:w-[393px] sm:h-[852px] sm:min-h-0 ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
