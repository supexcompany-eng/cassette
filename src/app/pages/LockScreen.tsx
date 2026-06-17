import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import PinPad from '../components/PinPad'
import { verifyPin } from '../../lib/appLock'

interface LockScreenProps {
  onUnlock: () => void
  onForgot: () => void
}

export default function LockScreen({ onUnlock, onForgot }: LockScreenProps) {
  const [error, setError] = useState(false)
  const [reset, setReset] = useState(0)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const onComplete = async (pin: string) => {
    if (await verifyPin(pin)) {
      onUnlock()
    } else {
      setError(true)
      setReset((r) => r + 1)
      setTimeout(() => setError(false), 400)
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <PinPad
        title={'카세트를 켜려면\n비밀번호를 눌러주세요'}
        onComplete={onComplete}
        resetSignal={reset}
        error={error}
        onForgot={() => setConfirmLogout(true)}
      />

      {/* 비밀번호 초기화 안내 → 로그아웃 확인 */}
      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmLogout(false)}
          >
            <motion.div
              className="w-full max-w-[300px] overflow-hidden rounded-[20px] bg-white/[0.97] pb-[6px] pt-[14px]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-[24px] py-[10px] text-center font-['Orbit'] text-[16px] leading-[28px] text-[#111]">
                설정된 비밀번호를 초기화하려면
                <br />
                로그아웃이 필요합니다
                <br />
                저장된 데이터는 삭제되지 않습니다
              </p>
              <div className="mt-[8px] flex">
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={onForgot}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  로그아웃
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
