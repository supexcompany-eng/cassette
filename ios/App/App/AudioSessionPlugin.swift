import Foundation
import Capacitor
import AVFoundation

/// 오디오 세션 볼륨 버스 문제 해결.
/// 평소(.playback)=미디어 볼륨(큼). 녹음(.playAndRecord)=마이크. 녹음 종료 시
/// deactivate→reactivate 로 미디어 볼륨 버스로 복귀(백그라운드 복귀가 하던 동작을 재현).
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setRecording", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        applyPlayback() // 앱 시작 시 기본은 미디어 볼륨
    }

    private func applyPlayback() {
        let s = AVAudioSession.sharedInstance()
        do {
            // .playback 은 옵션 없이 (.allowBluetoothA2DP 등은 playAndRecord 전용 → 주면 -50 에러)
            try s.setCategory(.playback, mode: .default)
            try s.setActive(true)
        } catch {
            // 무시 — 활성화 실패해도 앱 동작엔 영향 없음
        }
    }

    @objc func setRecording(_ call: CAPPluginCall) {
        let recording = call.getBool("value") ?? false
        let s = AVAudioSession.sharedInstance()
        if recording {
            do {
                try s.setCategory(.playAndRecord, mode: .default,
                                  options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
                try s.setActive(true)
            } catch {
                // 무시
            }
        } else {
            // 녹음 종료: deactivate → playback → reactivate (미디어 볼륨 버스로 복귀)
            try? s.setActive(false, options: .notifyOthersOnDeactivation)
            applyPlayback()
        }
        call.resolve()
    }
}
