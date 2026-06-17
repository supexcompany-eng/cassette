import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { getTape, listSegments, deleteTape } from '../../lib/db'
import { useTapePlayback } from '../../hooks/useTapePlayback'
import { useBlockSwipeBack } from '../../lib/swipeNav'
import CassetteDeck from '../components/CassetteDeck'
import NoteCard from '../components/NoteCard'
import icBack from '../../assets/ic_back.svg'
import icDel from '../../assets/ic_del.svg'
import type { Segment, Tape } from '../../lib/types'

// 받은 카세트 상세 — 내 카세트(플레이어)와 동일 스크롤 정책: 데크 폭(320~430) 스케일 고정 + 쪽지만 아래로 스크롤.
const STAGE_W = 393
const MEMO_TOP = 524 // 데크 아래 쪽지 시작 y (디자인 기준)
const NOTE_H = 180 // NoteCard(bg_memo 393×180) 자연 높이
const DECK_BOTTOM = 544 // 데크 시각 바닥 y (마스크 위치 기준, 쪽지와 20 overlap)

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
  useBlockSwipeBack(confirmDelete) // 삭제 다이얼로그 동안 뒤로가기 막음
  const [toast, setToast] = useState<string | null>(() => {
    const t = (location.state as { toast?: string } | null)?.toast
    return t ?? null
  })
  const playback = useTapePlayback(segments)

  useEffect(() => {
    // 플레이어와 동일: 폭 320~430 구간만 비례, 밖이면 경계값 고정 (데크가 폭을 꽉 채움)
    const fit = () => setScale(Math.max(320, Math.min(window.innerWidth, 430)) / STAGE_W)
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
      <div className="fixed inset-0 flex items-center justify-center bg-[#f5f3f1] font-mix text-[14px] text-[#888]">
        {loading ? 'loading…' : (error ?? '카세트를 찾을 수 없어요')}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#f5f3f1]">
      {/* 스크롤(z-0): 쪽지가 데크 아래로 스크롤 (내 카세트 플레이어와 동일 정책) */}
      <div className="absolute inset-0 z-0 overflow-y-auto overflow-x-hidden [overscroll-behavior:none]">
        <div style={{ paddingTop: MEMO_TOP * scale, paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}>
          <div className="relative mx-auto" style={{ width: STAGE_W * scale, height: NOTE_H * scale }}>
            <div
              className="absolute left-0 top-0"
              style={{ width: STAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              <NoteCard
                toName={tape.to_name ?? ''}
                note={tape.note ?? ''}
                fromName={tape.from_name ?? ''}
                date={formatDate(tape.shared_at)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 마스크(z-10): 데크 바닥에서 쪽지가 부드럽게 사라짐 (플레이어 mask_top과 동일) */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 h-[42px] bg-gradient-to-t from-[20%] from-[rgba(245,243,241,0)] to-[70%] to-[#f5f3f1]"
        style={{ top: DECK_BOTTOM * scale - 52 }}
      />

      {/* 데크(z-20): 폭(320~430) 스케일로 상단 고정. 컨트롤만 클릭 가능(플레이어와 동일) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div
          className="absolute left-1/2 top-0 w-[393px]"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
        >
          <CassetteDeck tape={tape} segments={segments} playback={playback} />
        </div>
      </div>

      {/* 헤더 — safe-area 기준 (백 / 삭제) */}
      <header
        className="absolute inset-x-0 z-30 flex h-[64px] items-center px-[16px]"
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

      {/* 토스트 (3초) — 하단 풀폭 바, 위치이동 없이 페이드만 (디자인 510:17554) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute inset-x-[20px] z-30 flex h-[44px] items-center justify-center rounded-[8px] bg-[#111]/80 font-['Orbit'] text-[14px] text-white"
            style={{ bottom: 'max(46px, env(safe-area-inset-bottom))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
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
