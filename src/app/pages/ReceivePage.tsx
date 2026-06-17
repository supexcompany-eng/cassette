import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { saveReceived } from '../../lib/db'
import { useSession } from '../auth/SessionContext'

/** 로그인하러 가기 전, 보관할 카세트 id 임시 저장 (로그인 후 복귀해서 보관) */
export const PENDING_RECEIVE_KEY = 'cassette.pendingReceive'

/**
 * 웹 링크에서 "저장"을 눌러 딥링크로 진입하는 페이지.
 * 로그인 확인 → 받은 카세트로 자동 보관 → 보관된 상세(/received/:id)로 이동.
 * (직접 보여주는 화면은 없고, 보관 처리 후 상세로 넘긴다)
 */
export default function ReceivePage() {
  const { id } = useParams<{ id: string }>() // 원본(공유) 카세트 id
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useSession()
  const handledRef = useRef(false) // 세션 객체가 바뀌어도(토큰 갱신 등) 보관은 1회만

  useEffect(() => {
    if (sessionLoading || !id) return

    // 미로그인 → 로그인 후 복귀해서 보관
    if (!session) {
      try {
        localStorage.setItem(PENDING_RECEIVE_KEY, id)
      } catch {
        // ignore
      }
      navigate('/login', { replace: true })
      return
    }

    if (handledRef.current) return // 이미 보관 처리 시작함 → 재실행 방지(루프 차단)
    handledRef.current = true

    let cancelled = false
    saveReceived(id)
      .then((res) => {
        if (cancelled) return
        if (res.status === 'own') {
          navigate(`/tape/${id}`, { replace: true }) // 내가 만든 카세트 → 일반 보기
          return
        }
        navigate(`/received/${res.tapeId}`, {
          replace: true,
          state: { toast: res.status === 'already' ? '이미 저장된 카세트입니다' : '받은 카세트에 저장되었습니다' },
        })
      })
      .catch(() => {
        if (!cancelled) navigate('/', { replace: true, state: { tab: 'received' } })
      })
    return () => {
      cancelled = true
    }
  }, [id, session, sessionLoading, navigate])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#e7e3df] font-mix text-[14px] text-[#888]">
      보관 중…
    </div>
  )
}
