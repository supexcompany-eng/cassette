import type { ReactNode } from 'react'

interface MobileFrameProps {
  children: ReactNode
  /** 안쪽 프레임에 덧붙일 클래스 (배경/글자색 오버라이드용). 기본은 다크 테마. */
  innerClassName?: string
  /** 바깥(상태바 영역·여백 포함) 배경 클래스. 기본은 검정. 상태바 영역 색을 페이지와 맞출 때 사용 */
  outerClassName?: string
}

export default function MobileFrame({
  children,
  innerClassName = 'bg-[#171717] text-[#E1E1E1]',
  outerClassName = 'bg-[#000000]',
}: MobileFrameProps) {
  return (
    <div className={`min-h-dvh sm:flex sm:items-center sm:justify-center ${outerClassName}`}>
      <div
        className={`relative mx-auto flex h-dvh w-full flex-col overflow-hidden sm:h-[852px] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
