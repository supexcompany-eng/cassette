import { useState } from 'react'
import { X } from 'lucide-react'
import PinPad from './PinPad'
import { setPin } from '../../lib/appLock'

interface PinSetupProps {
  onDone: () => void
  onCancel: () => void
}

// 비밀번호 설정/변경 — "새로운 비밀번호를 입력해주세요" (Figma 478:17580). 4자리 입력 시 설정.
export default function PinSetup({ onDone, onCancel }: PinSetupProps) {
  const [reset, setReset] = useState(0)

  const onComplete = async (pin: string) => {
    await setPin(pin)
    setReset((r) => r + 1)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[110]">
      {/* 헤더 (쪽지쓰기와 동일: safe-area 고정, 오른쪽 X) */}
      <div className="absolute inset-x-0 top-0 z-[1]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <header className="flex h-[64px] items-center px-[16px]">
          <div className="size-[40px] shrink-0" aria-hidden />
          <p className="min-w-px flex-1" />
          <button type="button" onClick={onCancel} className="flex size-[40px] shrink-0 items-center justify-center" aria-label="닫기">
            <X className="size-[24px] text-[#111]" strokeWidth={2} />
          </button>
        </header>
      </div>
      <PinPad title={'새로운 비밀번호를\n입력해주세요'} onComplete={onComplete} resetSignal={reset} />
    </div>
  )
}
