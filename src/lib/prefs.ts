/**
 * 사용자 환경설정 (localStorage 영속).
 * 현재: 플레이어 버튼 효과음 ON/OFF.
 */

const BUTTON_SOUND_KEY = 'cassette.buttonSound'

/** 플레이어 버튼음 켜짐 여부 (기본값: 켜짐) */
export function isButtonSoundOn(): boolean {
  try {
    return localStorage.getItem(BUTTON_SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

/** 플레이어 버튼음 설정 저장 */
export function setButtonSoundOn(on: boolean): void {
  try {
    localStorage.setItem(BUTTON_SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // ignore
  }
}
