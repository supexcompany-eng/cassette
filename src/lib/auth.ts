import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'

export type OAuthProvider = 'kakao' | 'google' | 'apple'

/** 네이티브 OAuth 복귀 딥링크 (Info.plist / AndroidManifest 스킴과 동일) */
export const NATIVE_REDIRECT = 'com.happycoding.cassette://login-callback'

/**
 * 소셜 로그인 시작.
 * - 네이티브: 시스템 브라우저로 provider 로그인 → 딥링크(NATIVE_REDIRECT)로 복귀 → SessionContext에서 코드 교환
 * - 웹: 현재 origin으로 리다이렉트 왕복 (detectSessionInUrl이 자동 처리)
 */
export async function signIn(provider: OAuthProvider): Promise<void> {
  // 카카오: 이메일(account_email)은 비즈앱 권한이 필요해 요청하지 않음. 닉네임/프로필사진만.
  const scopes = provider === 'kakao' ? 'profile_nickname profile_image' : undefined

  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true, scopes },
    })
    if (error) throw error
    if (data?.url) await Browser.open({ url: data.url })
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin, scopes },
    })
    if (error) throw error
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
