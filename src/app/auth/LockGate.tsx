import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { App as CapApp } from '@capacitor/app'
import { supabase } from '../../lib/supabase'
import { disableLock, isLockEnabled } from '../../lib/appLock'
import LockScreen from '../pages/LockScreen'

/**
 * 앱 잠금 게이트: PIN 설정 시 콜드스타트·실제 백그라운드 이탈 때 잠금화면을 덮는다.
 * 생체인증 프롬프트처럼 "순간 비활성"은 잠금하지 않도록 짧은 지연을 둔다(깜빡임 방지).
 */
export default function LockGate({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(() => isLockEnabled())

  useEffect(() => {
    let handle: { remove: () => void } | undefined
    let bgTimer: ReturnType<typeof setTimeout> | undefined
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // 복귀: 대기 중 잠금 타이머 취소 (Face ID 등 순간 비활성은 잠그지 않음)
        if (bgTimer) {
          clearTimeout(bgTimer)
          bgTimer = undefined
        }
      } else if (isLockEnabled() && !bgTimer) {
        // 비활성 후에도 잠깐 뒤 여전히 백그라운드면 = 실제 이탈 → 잠금
        bgTimer = setTimeout(() => {
          setLocked(true)
          bgTimer = undefined
        }, 400)
      }
    }).then((h) => {
      handle = h
    })
    return () => {
      handle?.remove()
      if (bgTimer) clearTimeout(bgTimer)
    }
  }, [])

  const onUnlock = useCallback(() => setLocked(false), [])
  const onForgot = useCallback(async () => {
    disableLock()
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setLocked(false) // 세션 사라지면 SessionContext가 /login으로 보냄
  }, [])

  return (
    <>
      {children}
      {locked && <LockScreen onUnlock={onUnlock} onForgot={onForgot} />}
    </>
  )
}
