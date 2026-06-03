import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react'
import { Trash2 } from 'lucide-react'
import icStack from '../../assets/ic_list.svg'
import { createTape, deleteTape, listTapesWithStats } from '../../lib/db'
import type { TapeWithStats } from '../../lib/types'
import MobileFrame from '../components/MobileFrame'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}분 ${s}초`
}

function StackIcon() {
  return <img src={icStack} alt="" className="size-[24px]" aria-hidden />
}

function PlusIcon() {
  return (
    <div className="relative size-[24px]" aria-hidden>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[16px] w-[2px] bg-[#e1e1e1] rounded-[1px]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-[16px] bg-[#e1e1e1] rounded-[1px]" />
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

const REVEAL_X = -70
const SWIPE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }
const SWIPE_VELOCITY_THRESHOLD = -500

function TapeRow({ tape, isOpen, hasOpenRow, onOpenChange, onNavigate, onDelete }: TapeRowProps) {
  const x = useMotionValue(0)
  const draggedRef = useRef(false)

  useEffect(() => {
    const controls = animate(x, isOpen ? REVEAL_X : 0, SWIPE_SPRING)
    return controls.stop
  }, [isOpen, x])

  return (
    <div className="relative h-[90px] w-full overflow-hidden" data-tape-row>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute right-[20px] top-1/2 -translate-y-1/2 size-[40px] rounded-full bg-[#C4383F] flex items-center justify-center"
        aria-label="delete tape"
      >
        <Trash2 className="size-[20px] text-white" strokeWidth={1.5} />
      </button>

      <motion.div
        drag="x"
        dragConstraints={{ left: REVEAL_X, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.5 }}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => {
          draggedRef.current = true
        }}
        onDragEnd={(_, info) => {
          const moved = Math.abs(info.offset.x) > 5
          const next = info.offset.x < REVEAL_X / 2 || info.velocity.x < SWIPE_VELOCITY_THRESHOLD
          onOpenChange(next)
          if (!moved) draggedRef.current = false
        }}
        onTap={() => {
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
        className="absolute inset-0 bg-[#171717] flex flex-col gap-[8px] items-start justify-center px-[24px] py-[16px] cursor-pointer"
      >
        <p className="font-['MaruBuri',sans-serif] font-light leading-[28px] text-[#e1e1e1] text-[16px] w-full truncate">
          {tape.title}
        </p>
        <div className="flex items-center justify-between w-full gap-[10px]">
          <div className="flex gap-[10px] items-center min-w-0">
            <p className="font-['MaruBuri',sans-serif] leading-[20px] text-[#888] text-[13px] whitespace-nowrap">
              {tape.segment_count}구간
            </p>
            <div className="h-[12px] w-[1px] bg-[#3a3a3a]" />
            <p className="font-['MaruBuri',sans-serif] leading-[20px] text-[#888] text-[13px] whitespace-nowrap">
              {formatDuration(tape.total_duration_seconds)}
            </p>
          </div>
          <p className="font-['MaruBuri',sans-serif] leading-[20px] text-[#888] text-[13px] whitespace-nowrap shrink-0">
            {formatDate(tape.created_at)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function TapeListPage() {
  const navigate = useNavigate()
  const [tapes, setTapes] = useState<TapeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

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
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const tape = await createTape()
      navigate(`/tape/${tape.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm('이 테이프를 삭제하시겠어요?')
    if (!ok) return
    try {
      await deleteTape(id)
      setTapes((prev) => prev.filter((t) => t.id !== id))
      setOpenId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <MobileFrame>
        <div
          className="shrink-0"
          style={{ height: 'max(env(safe-area-inset-top), 12px)' }}
        />

        <div className="flex items-center h-[56px] px-[12px] shrink-0">
          <div className="flex items-center justify-center size-[40px] shrink-0">
            <StackIcon />
          </div>
          <p className="flex-1 font-['Sometype_Mono',monospace] leading-[32px] text-[#e1e1e1] text-[18px] text-center">
            cassette
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center justify-center size-[40px] shrink-0 disabled:opacity-50"
            aria-label="새 테이프"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-[#888] text-[13px] font-['Sometype_Mono',monospace] mt-[20px] px-[24px]">
              loading...
            </p>
          )}
          {error && (
            <p className="text-[#C4383F] text-[12px] font-['MaruBuri',sans-serif] mt-[12px] px-[24px]">
              {error}
            </p>
          )}
          {!loading && tapes.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center text-center gap-[12px] pt-[80px] px-[24px]">
              <p className="text-[#888] text-[14px] font-['MaruBuri',sans-serif]">
                아직 녹음한 테이프가 없어요
              </p>
              <p className="text-[#515151] text-[12px] font-['MaruBuri',sans-serif]">
                위에서 새 테이프를 만들어 보세요
              </p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {tapes.map((tape, index) => (
              <div key={tape.id}>
                <TapeRow
                  tape={tape}
                  isOpen={openId === tape.id}
                  hasOpenRow={openId !== null}
                  onOpenChange={(open) => setOpenId(open ? tape.id : null)}
                  onNavigate={() => navigate(`/tape/${tape.id}`)}
                  onDelete={() => handleDelete(tape.id)}
                />
                {index < tapes.length - 1 && (
                  <div className="px-[20px]">
                    <div className="h-[1px] w-full bg-[#2a2a2a]" />
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>

        <div
          className="shrink-0"
          style={{ height: 'env(safe-area-inset-bottom)' }}
        />
    </MobileFrame>
  )
}
