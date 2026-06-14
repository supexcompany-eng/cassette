import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { getTape, listSegments, deleteTape } from '../../lib/db'
import { useTapePlayback } from '../../hooks/useTapePlayback'
import ShareStage from '../components/ShareStage'
import icBack from '../../assets/ic_back.svg'
import icDel from '../../assets/ic_del.svg'
import type { Segment, Tape } from '../../lib/types'

// 받은 카세트 상세: 풀스크린(852), 데크 top0, 쪽지 top524 (Figma 290-12604)
const STAGE_W = 393
const STAGE_H = 852
const DECK_TOP = 0
const MEMO_TOP = 524

function formatDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 받은 카세트 상세 — 보관된 복사본(내 것)을 본다. 헤더: 뒤로(받은 탭) / 삭제. CTA 없음. */
export default function ReceivedCassettePage() {
  const { id } = useParams<{ id: string }>() // 보관된 복사본 id (내 것)
  const navigate = useNavigate()
  const location = useLocation()
  const [tape, setTape] = useState<Tape | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<string | null>(() => {
    const t = (location.state as { toast?: string } | null)?.toast
    return t ?? null
  })
  const playback = useTapePlayback(segments)

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, 1.4))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([getTape(id), listSegments(id)])
      .then(([t, s]) => {
        if (cancelled) return
        setTape(t)
        setSegments(s)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '불러오지 못했어요'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const goReceivedTab = () => navigate('/', { replace: true, state: { tab: 'received' } })

  const handleDelete = async () => {
    setConfirmDelete(false)
    if (id) {
      try {
        await deleteTape(id)
      } catch {
        // ignore
      }
    }
    goReceivedTab()
  }

  if (loading || error || !tape) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#e7e3df] font-mix text-[14px] text-[#888]">
        {loading ? 'loading…' : (error ?? '카세트를 찾을 수 없어요')}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e7e3df]">
      <div
        className="absolute left-1/2 top-0"
        style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
      >
        <ShareStage
          tape={tape}
          segments={segments}
          playback={playback}
          headerText=""
          hideHeader
          toName={tape.to_name ?? ''}
          note={tape.note ?? ''}
          fromName={tape.from_name ?? ''}
          date={formatDate(tape.shared_at)}
          width={STAGE_W}
          height={STAGE_H}
          deckTop={DECK_TOP}
          memoTop={MEMO_TOP}
        />
      </div>

      {/* 헤더 — safe-area 기준 (백 / 삭제) */}
      <header
        className="absolute inset-x-0 z-20 flex h-[64px] items-center px-[16px]"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <button
          type="button"
          onClick={goReceivedTab}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="뒤로"
        >
          <img src={icBack} alt="" className="size-[24px]" aria-hidden />
        </button>
        <div className="min-w-px flex-1" />
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="삭제"
        >
          <img src={icDel} alt="" className="size-[24px]" aria-hidden />
        </button>
      </header>

      {/* 토스트 (3초) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black/75 px-[18px] py-[10px] font-['Orbit'] text-[13px] text-white"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 삭제 확인 */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              className="w-full max-w-[300px] overflow-hidden rounded-[20px] bg-white/[0.97] pb-[6px] pt-[14px]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-[24px] py-[10px] text-center font-['Orbit'] text-[16px] leading-[28px] text-[#111]">
                삭제된 내용은 복구할 수 없습니다
                <br />
                정말 삭제하시겠습니까?
              </p>
              <div className="mt-[8px] flex">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
