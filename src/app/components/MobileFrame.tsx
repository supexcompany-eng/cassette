import type { ReactNode } from 'react'

interface MobileFrameProps {
  children: ReactNode
}

export default function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="min-h-dvh bg-[#000000] sm:flex sm:items-center sm:justify-center">
      <div className="relative mx-auto flex w-full flex-col overflow-hidden bg-[#171717] text-[#E1E1E1] min-h-dvh sm:w-[393px] sm:h-[852px] sm:min-h-0">
        {children}
      </div>
    </div>
  )
}
