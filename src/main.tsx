import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './app/App'
import './styles/index.css'

// 네이티브(iOS) 앱에서만: 웹뷰를 상태바 밑까지 풀스크린 + 어두운(검정) 글자.
// 웹 브라우저에선 isNativePlatform()=false 라 아무것도 실행 안 함.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
