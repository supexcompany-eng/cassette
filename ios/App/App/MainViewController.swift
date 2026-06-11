import UIKit
import Capacitor

/// 앱 내장 커스텀 플러그인을 명시적으로 등록한다.
/// (node_modules 패키지 플러그인은 자동등록되지만, 앱 타깃에 직접 둔 플러그인은 수동 등록 필요)
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioSessionPlugin())
    }
}
