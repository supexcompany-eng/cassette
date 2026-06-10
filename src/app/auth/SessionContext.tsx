import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../../lib/supabase'

interface SessionState {
  session: Session | null
  loading: boolean
}

const SessionContext = createContext<SessionState>({ session: null, loading: true })

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => useContext(SessionContext)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // 초기 세션 로드 + 상태 변화 구독
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 네이티브: OAuth 복귀 딥링크에서 인증 코드 → 세션 교환
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handlePromise = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('com.happycoding.cassette://')) return
      try {
        const code = new URL(url).searchParams.get('code')
        if (code) await supabase.auth.exchangeCodeForSession(code)
      } catch {
        // ignore
      }
      await Browser.close().catch(() => {})
    })
    return () => {
      void handlePromise.then((h) => h.remove())
    }
  }, [])

  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>
}

/** 로그인 필요한 라우트 가드 — 미로그인 시 /login으로 */
export function RequireAuth() {
  const { session, loading } = useSession()
  if (loading) return <div className="h-dvh w-full bg-[#f5f3f1]" />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
