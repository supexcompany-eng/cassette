import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import MobileFrame from '../components/MobileFrame'
import { signIn, type OAuthProvider } from '../../lib/auth'
import { useSession } from '../auth/SessionContext'
import icKakao from '../../assets/ic_kakao.svg'
import icGoogle from '../../assets/ic_google.svg'
import icApple from '../../assets/ic_apple.svg'

const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

export default function LoginPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  // 로그인되면(딥링크 복귀 포함) 메인으로
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  const login = (provider: OAuthProvider) => {
    if (busy) return
    setBusy(provider)
    signIn(provider).catch(() => setBusy(null))
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 브랜딩 (상단~중앙) */}
      <div className="flex flex-1 flex-col items-center justify-center px-[20px]">
        <p className="text-center font-mix text-[27px] font-medium leading-none text-[#111]">Cassette</p>
        <p className="mt-[14px] text-center font-['Orbit'] text-[14px] text-[#111] opacity-60">
          당신의 순간을 기록하세요
        </p>
      </div>

      {/* 로그인 버튼 3개 (하단) */}
      <div
        className="flex flex-col items-center gap-[14px] px-[20px]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}
      >
        <button
          type="button"
          onClick={() => login('kakao')}
          className="flex h-[48px] w-[300px] items-center justify-center gap-[10px] rounded-[8px] bg-[#fee500] active:brightness-95"
          style={{ fontFamily: SYSTEM_FONT }}
        >
          <img src={icKakao} alt="" aria-hidden className="size-[16.2px]" />
          <span className="text-[14px] text-[#111]">카카오 로그인</span>
        </button>

        <button
          type="button"
          onClick={() => login('google')}
          className="flex h-[48px] w-[300px] items-center justify-center gap-[10px] rounded-[8px] border border-[#eceae7] bg-white active:brightness-95"
          style={{ fontFamily: SYSTEM_FONT }}
        >
          <img src={icGoogle} alt="" aria-hidden className="size-[16.2px]" />
          <span className="text-[14px] text-[#111]">Google 로그인</span>
        </button>

        <button
          type="button"
          onClick={() => login('apple')}
          className="flex h-[48px] w-[300px] items-center justify-center gap-[10px] rounded-[8px] bg-[#050708] active:brightness-110"
          style={{ fontFamily: SYSTEM_FONT }}
        >
          <img src={icApple} alt="" aria-hidden className="h-[16.875px] w-[13.5px]" />
          <span className="text-[14px] text-white">Apple 로그인</span>
        </button>
      </div>
    </MobileFrame>
  )
}
