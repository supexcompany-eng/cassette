/**
 * 앱 전역 단일 AudioContext.
 *
 * iOS WKWebView는 AudioContext가 여러 개일 때(특히 녹음 중 마이크 입력 컨텍스트가 추가되면)
 * 서로 interrupt/ducking 되어 효과음·재생·입력 볼륨이 모두 작아지는 문제가 있다.
 * → 효과음(PlayerControls)·재생(usePlayer)·VU(VuMeter)가 이 하나를 공유해서 회피한다.
 *
 * 절대 close()하지 않는다(앱 생애주기 동안 단일 인스턴스 유지).
 */
let shared: AudioContext | null = null

export function getSharedAudioContext(): AudioContext {
  if (!shared || shared.state === 'closed') {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    shared = new Ctx()
  }
  return shared
}

/** iOS: 사용자 제스처/재생 시 호출해 suspended/interrupted 상태에서 깨운다. */
export function resumeSharedAudioContext(): void {
  try {
    void shared?.resume()
  } catch {
    // ignore
  }
}

/**
 * WebAudio 엔진을 잠시 suspend → WebKit이 AVAudioSession을 놓게 한다.
 * (녹음 종료 후 네이티브가 세션을 .playback으로 재활성화할 수 있도록 — 백그라운드 복귀 흉내)
 */
export async function suspendSharedAudioContext(): Promise<void> {
  try {
    await shared?.suspend()
  } catch {
    // ignore
  }
}
