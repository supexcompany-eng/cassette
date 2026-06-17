import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { deleteTape, listTapesWithStats, listReceivedTapesWithStats } from '../../lib/db'
import { useBlockSwipeBack } from '../../lib/swipeNav'
import type { TapeWithStats } from '../../lib/types'
import MobileFrame from '../components/MobileFrame'
import CassetteStackRow from '../components/CassetteStackRow'
import { STACK_SHADOW } from '../../lib/cassetteStack'
import icStack from '../../assets/ic_stack.svg'
import icList from '../../assets/ic_list.svg'
import icSettings from '../../assets/ic_settings.svg'
import tabSelected from '../../assets/img_tab_bg_selected.png'
import tabNormal from '../../assets/img_tab_bg_normal.png'

type ViewMode = 'list' | 'stack'
type MainTab = 'mine' | 'received'
const VIEW_MODE_KEY = 'cassette.viewMode'
const MAIN_TAB_KEY = 'cassette.mainTab'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

/** 문구 미입력 시 보여줄 테이프명 (재생화면 카세트 라벨과 동일) */
const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}분 ${s}초`
}

/** FAB(우하단) 흰색 + 아이콘 */
function FabPlusIcon() {
  return (
    <div className="relative size-[24px]" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[17px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-white" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-[17px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-white" />
    </div>
  )
}

/** 폴더형 탭 (내 카세트 / 받은 카세트) — Figma Component 2 (탭 130×48, 좌14/124 겹침) */
function FolderTab({ label, active, onClick, left }: { label: string; active: boolean; onClick: () => void; left: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-[12px] h-[48px] w-[130px] overflow-hidden"
      style={{ left, zIndex: active ? 2 : 1 }}
    >
      <img src={active ? tabSelected : tabNormal} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none" />
      <span className={`absolute left-[20px] top-[17px] font-['Orbit'] text-[14px] ${active ? 'text-[#111]' : 'text-[#888]'}`}>
        {label}
      </span>
    </button>
  )
}

/** 받은 카세트 리스트 행 — 제목 + from. 보내는사람 + 통계. 스와이프 삭제(내 카세트와 동일) */
function ReceivedTapeRow({
  tape,
  fromName,
  isOpen,
  hasOpenRow,
  onOpenChange,
  onNavigate,
  onDelete,
}: {
  tape: TapeWithStats
  fromName: string
  isOpen: boolean
  hasOpenRow: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
  onDelete: () => void
}) {
  const x = useMotionValue(0)
  const draggedRef = useRef(false)
  const [pressed, setPressed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const caption = tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER

  useEffect(() => {
    const controls = animate(x, isOpen ? REVEAL_X : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  return (
    <div className="relative h-[114px] w-full overflow-hidden" data-tape-row>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-[20px] top-1/2 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-[#F54C4C]"
        aria-label="delete tape"
      >
        <Trash2 className="size-[20px] text-white" strokeWidth={1.5} />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: REVEAL_X, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onTapStart={() => setPressed(true)}
        onTapCancel={() => setPressed(false)}
        onDragStart={() => {
          draggedRef.current = true
          setPressed(false)
          setDragging(true)
        }}
        onDragEnd={(_, info) => {
          setDragging(false)
          const moved = Math.abs(info.offset.x) > 5
          const next = info.offset.x < REVEAL_X / 2 || info.velocity.x < SWIPE_VELOCITY_THRESHOLD
          animate(x, next ? REVEAL_X : 0, SWIPE_SPRING)
          onOpenChange(next)
          if (!moved) draggedRef.current = false
        }}
        onTap={() => {
          setPressed(false)
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          if (isOpen || hasOpenRow) {
            onOpenChange(false)
            return
          }
          onNavigate()
        }}
        className={`absolute inset-0 flex cursor-pointer flex-col justify-center gap-[6px] px-[24px] py-[18px] ${
          pressed || dragging || isOpen ? 'rounded-[8px] bg-[#f0edea]' : 'bg-[#f5f3f1]'
        }`}
      >
        <p className="w-full truncate font-mix text-[16px] leading-[28px] text-[#111]">{caption}</p>
        <p className="w-full truncate font-mix text-[13px] leading-[20px] text-[#888]">from. {fromName}</p>
        <div className="flex w-full items-center justify-between gap-[10px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">{tape.segment_count}구간</p>
            <div className="h-[10px] w-px bg-[#cbc6bd]" />
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
              {formatDuration(tape.total_duration_seconds)}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
            {formatDate(tape.created_at)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

interface TapeRowProps {
  tape: TapeWithStats
  isOpen: boolean
  hasOpenRow: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
  onDelete: () => void
}

const REVEAL_X = -74 // 삭제 버튼(40) + 우측 마진 20 + 간격 14px 노출 (Figma delete state)
const SWIPE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }
const SWIPE_VELOCITY_THRESHOLD = -500

function TapeRow({ tape, isOpen, hasOpenRow, onOpenChange, onNavigate, onDelete }: TapeRowProps) {
  const x = useMotionValue(0)
  const draggedRef = useRef(false)
  const [pressed, setPressed] = useState(false) // 터치 다운 하이라이트(pressed state)
  const [dragging, setDragging] = useState(false)
  const caption = tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER

  useEffect(() => {
    const controls = animate(x, isOpen ? REVEAL_X : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  return (
    <div className="relative h-[90px] w-full overflow-hidden" data-tape-row>
      {/* 삭제 버튼 (스와이프 시 노출) — 우측 마진 20px, #F54C4C */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-[20px] top-1/2 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-[#F54C4C]"
        aria-label="delete tape"
      >
        <Trash2 className="size-[20px] text-white" strokeWidth={1.5} />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: REVEAL_X, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onTapStart={() => setPressed(true)}
        onTapCancel={() => setPressed(false)}
        onDragStart={() => {
          draggedRef.current = true
          setPressed(false)
          setDragging(true)
        }}
        onDragEnd={(_, info) => {
          setDragging(false)
          const moved = Math.abs(info.offset.x) > 5
          const next = info.offset.x < REVEAL_X / 2 || info.velocity.x < SWIPE_VELOCITY_THRESHOLD
          // 놓는 즉시 항상 완전히 열림/닫힘으로 스냅 (iOS 기본 동작 — 중간 상태 없음)
          animate(x, next ? REVEAL_X : 0, SWIPE_SPRING)
          onOpenChange(next)
          if (!moved) draggedRef.current = false
        }}
        onTap={() => {
          setPressed(false)
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          if (isOpen) {
            onOpenChange(false)
            return
          }
          if (hasOpenRow) {
            onOpenChange(false)
            return
          }
          onNavigate()
        }}
        className={`absolute inset-0 flex cursor-pointer flex-col justify-center gap-[6px] px-[24px] py-[18px] ${
          pressed || dragging || isOpen ? 'rounded-[8px] bg-[#f0edea]' : 'bg-[#f5f3f1]'
        }`}
      >
        <p className="w-full truncate font-mix text-[16px] leading-[28px] text-[#111]">{caption}</p>
        <div className="flex w-full items-center justify-between gap-[10px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">{tape.segment_count}구간</p>
            <div className="h-[10px] w-px bg-[#cbc6bd]" />
            <p className="whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
              {formatDuration(tape.total_duration_seconds)}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap font-mix text-[13px] leading-[20px] text-[#888]">
            {formatDate(tape.created_at)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function TapeListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [tapes, setTapes] = useState<TapeWithStats[]>([])
  const [receivedTapes, setReceivedTapes] = useState<TapeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  useBlockSwipeBack(true) // 메인 화면에선 가장자리 스와이프 뒤로가기 막음 (삭제 다이얼로그 포함)
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    const fromState = (location.state as { tab?: MainTab } | null)?.tab
    if (fromState === 'received' || fromState === 'mine') return fromState
    try {
      return localStorage.getItem(MAIN_TAB_KEY) === 'received' ? 'received' : 'mine'
    } catch {
      return 'mine'
    }
  })
  // 탭 선택 유지 (상세 갔다 와도 복원)
  useEffect(() => {
    try {
      localStorage.setItem(MAIN_TAB_KEY, activeTab)
    } catch {
      // ignore
    }
  }, [activeTab])
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'stack' ? 'stack' : 'list'
    } catch {
      return 'list'
    }
  })
  const toggleViewMode = () => {
    setViewMode((m) => {
      const next: ViewMode = m === 'stack' ? 'list' : 'stack'
      try {
        localStorage.setItem(VIEW_MODE_KEY, next)
      } catch {
        // ignore
      }
      setOpenId(null)
      return next
    })
  }

  useEffect(() => {
    if (!openId) return
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('[data-tape-row]')) return
      setOpenId(null)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [openId])

  useEffect(() => {
    let cancelled = false
    listTapesWithStats()
      .then((t) => {
        if (!cancelled) setTapes(t)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    listReceivedTapesWithStats()
      .then((t) => {
        if (!cancelled) setReceivedTapes(t)
      })
      .catch(() => {
        // 받은 카세트 로드 실패는 조용히 무시
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      await deleteTape(id)
      setTapes((prev) => prev.filter((t) => t.id !== id))
      setReceivedTapes((prev) => prev.filter((t) => t.id !== id))
      setOpenId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      {/* 시스템 상태바 자리 (safe-area) — 앱에선 실제 상태바가 이 자리에 노출. 상단존 #ece9e6 */}
      <div className="shrink-0 bg-[#ece9e6]" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 헤더 (Figma title: px-16 py-12, h64) — 상단존 #ece9e6 */}
      <div className="flex h-[64px] shrink-0 items-center gap-[10px] bg-[#ece9e6] px-[16px]">
        <button
          type="button"
          onClick={toggleViewMode}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="보기 방식 전환"
        >
          <img src={viewMode === 'stack' ? icList : icStack} alt="" className="size-[24px]" aria-hidden />
        </button>
        <p className="min-w-px flex-1 text-center font-mix text-[20px] font-medium leading-[32px] text-[#111]">Cassette</p>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="설정"
        >
          <img src={icSettings} alt="" className="size-[24px]" aria-hidden />
        </button>
      </div>

      {/* 탭 (내 카세트 / 받은 카세트) — Figma Component 2. 상단존 #ece9e6, 하단 10px 띠는 컨텐츠색+위로향한 그림자 */}
      <div className="relative h-[70px] shrink-0 bg-[#ece9e6]">
        <FolderTab label="내 카세트" active={activeTab === 'mine'} left={14} onClick={() => { setActiveTab('mine'); setOpenId(null) }} />
        <FolderTab label="받은 카세트" active={activeTab === 'received'} left={124} onClick={() => { setActiveTab('received'); setOpenId(null) }} />
        <div className="absolute bottom-0 left-0 h-[10px] w-full bg-[#f5f3f1] shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.03)]" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overscroll-behavior:none]">
        {activeTab === 'mine' ? (
          <>
            {loading && <p className="mt-[20px] px-[24px] font-mix text-[13px] text-[#888]">loading...</p>}
            {error && <p className="mt-[12px] px-[24px] font-mix text-[12px] text-[#F54C4C]">{error}</p>}
            {!loading && tapes.length === 0 && !error && (
              <div className="flex h-[400px] items-center justify-center px-[24px] text-center">
                <p className="font-mix text-[14px] text-[#b6b6b6]">기록하고 싶은 순간을 모아보세요</p>
              </div>
            )}
            {viewMode === 'stack' ? (
              <div className="mx-auto w-full max-w-[430px] px-[20px] pt-[20px]">
                <div className="flex flex-col gap-[4px]">
                  {tapes.map((tape) => (
                    <CassetteStackRow
                      key={tape.id}
                      tape={tape}
                      isOpen={openId === tape.id}
                      hasOpenRow={openId !== null}
                      onOpenChange={(open) => setOpenId(open ? tape.id : null)}
                      onNavigate={() => navigate(`/tape/${tape.id}`)}
                      onDelete={() => setConfirmDeleteId(tape.id)}
                    />
                  ))}
                </div>
                {/* 스택 맨 아래 그림자 — 길이와 무관, 간격 0으로 딱 붙음 */}
                {tapes.length > 0 && (
                  <img src={STACK_SHADOW} alt="" aria-hidden draggable={false} className="block w-full select-none" />
                )}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {tapes.map((tape) => (
                  <TapeRow
                    key={tape.id}
                    tape={tape}
                    isOpen={openId === tape.id}
                    hasOpenRow={openId !== null}
                    onOpenChange={(open) => setOpenId(open ? tape.id : null)}
                    onNavigate={() => navigate(`/tape/${tape.id}`)}
                    onDelete={() => setConfirmDeleteId(tape.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </>
        ) : receivedTapes.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center px-[24px] text-center">
            <p className="font-mix text-[14px] text-[#b6b6b6]">받은 카세트가 아직 없어요</p>
          </div>
        ) : viewMode === 'stack' ? (
          <div className="mx-auto w-full max-w-[430px] px-[20px] pt-[20px]">
            <div className="flex flex-col gap-[4px]">
              {receivedTapes.map((tape) => (
                <CassetteStackRow
                  key={tape.id}
                  tape={tape}
                  isOpen={openId === tape.id}
                  hasOpenRow={openId !== null}
                  onOpenChange={(open) => setOpenId(open ? tape.id : null)}
                  onNavigate={() => navigate(`/received/${tape.id}`)}
                  onDelete={() => setConfirmDeleteId(tape.id)}
                />
              ))}
            </div>
            <img src={STACK_SHADOW} alt="" aria-hidden draggable={false} className="block w-full select-none" />
          </div>
        ) : (
          <div>
            {receivedTapes.map((tape) => (
              <ReceivedTapeRow
                key={tape.id}
                tape={tape}
                fromName={tape.from_name ?? ''}
                isOpen={openId === tape.id}
                hasOpenRow={openId !== null}
                onOpenChange={(open) => setOpenId(open ? tape.id : null)}
                onNavigate={() => navigate(`/received/${tape.id}`)}
                onDelete={() => setConfirmDeleteId(tape.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom)' }} />

      {/* 새 테이프 FAB (우하단 검은 원형 60px) — 내 카세트 탭에서만 */}
      {activeTab === 'mine' && (
        <button
          type="button"
          onClick={() => navigate('/new')}
          aria-label="새 테이프"
          className="absolute right-[20px] z-40 flex size-[60px] items-center justify-center rounded-full bg-[#111] shadow-[0_4px_12px_rgba(0,0,0,0.25)] active:brightness-90"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <FabPlusIcon />
        </button>
      )}

      {/* ===== 삭제 확인 다이얼로그 (z-50) — 재생/편집 화면과 통일 ===== */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmDeleteId(null)}
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
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  )
}
