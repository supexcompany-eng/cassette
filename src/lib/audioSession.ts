import { Capacitor, registerPlugin } from '@capacitor/core'

interface AudioSessionPlugin {
  setRecording(options: { value: boolean }): Promise<void>
}

const AudioSession = registerPlugin<AudioSessionPlugin>('AudioSession')

/**
 * 녹음 시작 시 true(.playAndRecord), 종료 시 false(deactivate→.playback→reactivate) 호출.
 * iOS에서 녹음 후 출력이 통화 볼륨 버스로 넘어가 작아지는 문제를 미디어 볼륨 버스로 복귀시킨다.
 * (웹/안드로이드는 무시)
 */
export async function setRecordingAudioMode(recording: boolean): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return
  try {
    await AudioSession.setRecording({ value: recording })
  } catch {
    // 미등록/실패 시 무시
  }
}
