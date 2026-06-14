import { useEffect } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'

interface SwipeNavPlugin {
  setSwipeBack(options: { value: boolean }): Promise<void>
}

const AudioSession = registerPlugin<SwipeNavPlugin>('AudioSession')

// 막는 팝업이 하나라도 떠 있으면(blockers>0) 제스처 끔. 중첩 가능하므로 카운트.
let blockers = 0

function apply(): void {
  if (Capacitor.getPlatform() !== 'ios') return
  AudioSession.setSwipeBack({ value: blockers === 0 }).catch(() => {})
}

/**
 * 풀팝업(헤더 닫기 버튼만)·다이얼로그가 떠 있는 동안 iOS 가장자리 뒤로/앞으로 제스처를 막는다.
 * active=true 인 동안만 블록하며, 언마운트/false 시 해제. (웹·안드로이드는 무시)
 */
export function useBlockSwipeBack(active: boolean): void {
  useEffect(() => {
    if (!active) return
    blockers += 1
    apply()
    return () => {
      blockers = Math.max(0, blockers - 1)
      apply()
    }
  }, [active])
}
