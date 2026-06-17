import { useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import TapeListPage from './pages/TapeListPage'
import NewCassettePage from './pages/NewCassettePage'
import TapePage from './pages/TapePage'
import SharePage from './pages/SharePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import ReceivePage from './pages/ReceivePage'
import ReceivedCassettePage from './pages/ReceivedCassettePage'
import { SessionProvider, RequireAuth } from './auth/SessionContext'
import LockGate from './auth/LockGate'
// 꾸미기(DecoratePage)는 현재 스펙아웃 — 라우트 제외(파일은 보존). 재도입 시 import/route 복구.

/** 네이티브: 공유 딥링크(com.happycoding.cassette://s/<id>)로 앱이 열리면 받기 화면으로 이동 */
function DeepLinkHandler() {
  const navigate = useNavigate()
  const lastUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const toReceive = (url?: string | null) => {
      const m = url?.match(/^com\.happycoding\.cassette:\/\/s\/([^?#/]+)/)
      if (m && url !== lastUrlRef.current) {
        lastUrlRef.current = url ?? null
        navigate(`/receive/${m[1]}`)
      }
    }
    // 콜드스타트: 앱이 딥링크로 처음 켜진 경우
    CapApp.getLaunchUrl()
      .then((res) => toReceive(res?.url))
      .catch(() => {})
    // 웜: 앱이 떠 있을 때 딥링크
    const handle = CapApp.addListener('appUrlOpen', ({ url }) => toReceive(url))
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [navigate])
  return null
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <DeepLinkHandler />
        <LockGate>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/s/:id" element={<SharePage />} />
          <Route path="/receive/:id" element={<ReceivePage />} />
          {/* 로그인 필요 라우트 */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<TapeListPage />} />
            <Route path="/new" element={<NewCassettePage />} />
            <Route path="/tape/:id/edit" element={<NewCassettePage />} />
            <Route path="/tape/:id" element={<TapePage />} />
            <Route path="/received/:id" element={<ReceivedCassettePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LockGate>
      </BrowserRouter>
    </SessionProvider>
  )
}
