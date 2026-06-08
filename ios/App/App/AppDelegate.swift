import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        // window 는 didFinishLaunching 직후(스토리보드 로드 시) 생성되므로 다음 런루프에서 오버레이를 붙인다.
        DispatchQueue.main.async { [weak self] in
            self?.showSplashOverlay()
        }
        return true
    }

    /// 네이티브 스플래시 오버레이.
    /// "Splash" 이미지를 앱 시작 즉시 띄워 SPLASH_SECONDS 동안 유지한 뒤 페이드아웃한다.
    /// 해상도 대응: 이미지 "가로"를 화면 폭에 가득 채우고(원본 비율 유지), 세로는 센터 정렬,
    /// 화면을 넘치는 위/아래는 컨테이너에서 잘라낸다. (이미지 크기가 바뀌어도 자동 대응)
    /// (이미지 에셋 이름이 "Splash"가 아니게 되면 아래 UIImage(named:)도 함께 수정할 것)
    private func showSplashOverlay() {
        let splashSeconds: TimeInterval = 1.5
        let fadeSeconds: TimeInterval = 0.4

        let keyWindow = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first(where: { $0.isKeyWindow }) }
            .first
        guard let window = self.window ?? keyWindow ?? UIApplication.shared.windows.first else { return }

        // 컨테이너: 화면 전체를 덮고 넘치는 부분을 잘라낸다(crop). 배경색 #c0bdba.
        let container = UIView(frame: window.bounds)
        container.backgroundColor = UIColor(red: 0.7529, green: 0.7412, blue: 0.7294, alpha: 1.0)
        container.clipsToBounds = true
        container.isUserInteractionEnabled = true // 스플래시 동안 탭 차단
        container.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // 이미지: 가로를 컨테이너 폭에 맞추고 세로는 원본 비율대로 → 세로 센터 정렬
        let imageView = UIImageView()
        imageView.image = UIImage(named: "Splash")
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        if let img = imageView.image, img.size.width > 0 {
            let w = container.bounds.width
            let h = w * img.size.height / img.size.width
            imageView.frame = CGRect(x: 0, y: (container.bounds.height - h) / 2, width: w, height: h)
        } else {
            imageView.frame = container.bounds
        }
        // 폭은 화면 따라 늘고, 위·아래 여백은 유연하게 → 항상 가로 가득 + 세로 중앙
        imageView.autoresizingMask = [.flexibleWidth, .flexibleTopMargin, .flexibleBottomMargin]
        container.addSubview(imageView)
        window.addSubview(container)

        DispatchQueue.main.asyncAfter(deadline: .now() + splashSeconds) {
            UIView.animate(withDuration: fadeSeconds, animations: {
                container.alpha = 0
            }, completion: { _ in
                container.removeFromSuperview()
            })
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
