import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, Reorder, useDragControls } from 'motion/react'
import {
  deleteSegment as deleteSegmentDb,
  deleteTape,
  getTape,
  insertSegment,
  listSegments,
  reorderSegments,
  updateSegment,
  updateTape,
} from '../../lib/db'
import { deleteAudio, getAudioUrl, uploadAudio } from '../../lib/storage'
import type { Segment, Sticker, Tape } from '../../lib/types'
import { useRecorder } from '../../hooks/useRecorder'
import { usePlayer } from '../../hooks/usePlayer'
import MobileFrame from '../components/MobileFrame'
import PlayerControls, { type ControlType } from '../components/PlayerControls'
import VuMeter from '../components/VuMeter'
import SegmentItem from '../components/SegmentItem'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import icBack from '../../assets/ic_back.svg'
import icMore from '../../assets/ic_more.svg'
import imgPlayerBody from '../../assets/img_player_body.png'
import imgCassette from '../../assets/img_cassette_simple_3.png'

const MAX_TAPE_SECONDS = 30 * 60
/** 카세트 라벨에 노출되는 사용자 문구의 최대 글자 수 */
const MAX_CAPTION_LENGTH = 15
/** 문구 미입력 시 카세트 라벨에 보여줄 안내 문구 */
const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'

/** MM:SS 형식 (예: 510초 → "08:30") */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const TOTAL_CLOCK = formatClock(MAX_TAPE_SECONDS) // "30:00"

export default function TapePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [tape, setTape] = useState<Tape | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pressedButton, setPressedButton] = useState<ControlType | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [recIntent, setRecIntent] = useState(false)
  const [, setSwipeOpenId] = useState<string | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])

  const recorder = useRecorder()
  const player = usePlayer()

  const playQueueRef = useRef<{ stop: boolean }>({ stop: false })
  const editTimersRef = useRef<Map<string, number>>(new Map())
  const totalAtRecStartRef = useRef(0)
  const autoStopTriggeredRef = useRef(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([getTape(id), listSegments(id)])
      .then(([t, s]) => {
        if (cancelled) return
        if (!t) {
          setError('테이프를 찾을 수 없어요')
        } else {
          setTape(t)
          setSegments(s)
          setStickers(t.decoration ?? [])
        }
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
  }, [id])

  useEffect(() => {
    const timers = editTimersRef.current
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-segment-item]')) return
      setFocusedIndex(null)
    }
    document.addEventListener('click', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const totalSeconds = useMemo(
    () => segments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
    [segments],
  )

  const liveSeconds = recorder.isRecording
    ? Math.min(MAX_TAPE_SECONDS, totalAtRecStartRef.current + recorder.elapsedSeconds)
    : totalSeconds

  const reelSpinning = recorder.isRecording || recIntent || !!player.playingId

  const handleSegmentMessage = (segId: string, newMessage: string) => {
    setSegments((prev) => prev.map((s) => (s.id === segId ? { ...s, message: newMessage } : s)))
    const timers = editTimersRef.current
    const existing = timers.get(segId)
    if (existing) window.clearTimeout(existing)
    const handle = window.setTimeout(() => {
      void updateSegment(segId, { message: newMessage }).catch(() => undefined)
      timers.delete(segId)
    }, 500)
    timers.set(segId, handle)
  }

  const handleDeleteSegment = async (segId: string) => {
    const target = segments.find((s) => s.id === segId)
    if (!target) return
    setSegments((prev) => prev.filter((s) => s.id !== segId))
    try {
      await deleteSegmentDb(segId)
      if (target.audio_path) await deleteAudio(target.audio_path).catch(() => undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const handleReorder = (next: Segment[]) => {
    setSegments(next)
    const updates = next.map((s, idx) => ({ id: s.id, position: idx }))
    void reorderSegments(updates).catch(() => undefined)
  }

  const startRecording = useCallback(async () => {
    if (!id) return
    if (totalSeconds >= MAX_TAPE_SECONDS) {
      setError('최대 녹음 시간(30분)에 도달했어요')
      return
    }
    if (player.playingId) player.stop()
    totalAtRecStartRef.current = totalSeconds
    autoStopTriggeredRef.current = false
    setError(null)
    setRecIntent(true)
    try {
      await recorder.start()
    } catch (e) {
      setRecIntent(false)
      setError(e instanceof Error ? e.message : 'Microphone unavailable')
    }
  }, [id, player, recorder, totalSeconds])

  const stopRecording = useCallback(async () => {
    if (!id) return
    setRecIntent(false)
    const result = await recorder.stop()
    if (!result) return
    try {
      const ext = result.mimeType.includes('mp4') ? 'mp4' : result.mimeType.includes('ogg') ? 'ogg' : 'webm'
      const path = await uploadAudio(id, result.blob, ext)
      const remaining = Math.max(0, MAX_TAPE_SECONDS - totalAtRecStartRef.current)
      const clampedDuration = Math.min(result.durationSeconds, remaining)
      const nextPosition = segments.length
      const inserted = await insertSegment({
        tape_id: id,
        position: nextPosition,
        message: '',
        duration_seconds: clampedDuration,
        audio_path: path,
      })
      setSegments((prev) => [...prev, inserted])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recording')
    }
  }, [id, recorder, segments.length])

  useEffect(() => {
    if (!recorder.isRecording) {
      autoStopTriggeredRef.current = false
      return
    }
    if (autoStopTriggeredRef.current) return
    const live = totalAtRecStartRef.current + recorder.elapsedSeconds
    if (live >= MAX_TAPE_SECONDS) {
      autoStopTriggeredRef.current = true
      void stopRecording()
    }
  }, [recorder.elapsedSeconds, recorder.isRecording, stopRecording])

  const playFrom = useCallback(
    (startIndex: number) => {
      playQueueRef.current.stop = false
      const playable = segments.filter((s) => s.audio_path)
      if (playable.length === 0) return
      const startId = segments[startIndex]?.id
      const queueIndex = Math.max(
        0,
        playable.findIndex((s) => s.id === startId),
      )
      let i = queueIndex
      const playNext = () => {
        if (playQueueRef.current.stop) return
        if (i >= playable.length) {
          setCurrentIndex(0)
          setFocusedIndex(null)
          return
        }
        const seg = playable[i]
        const absoluteIndex = segments.findIndex((s) => s.id === seg.id)
        if (absoluteIndex >= 0) setCurrentIndex(absoluteIndex)
        const url = getAudioUrl(seg.audio_path!)
        player.play(url, seg.id, () => {
          i += 1
          playNext()
        })
      }
      playNext()
    },
    [player, segments],
  )

  const handleButtonAction = (type: ControlType) => {
    if (type === 'rec') {
      if (recorder.isRecording) return
      void startRecording()
      return
    }
    if (type === 'stop') {
      if (recorder.isRecording) {
        void stopRecording()
      } else {
        playQueueRef.current.stop = true
        player.stop()
      }
      return
    }
    if (type === 'play') {
      if (recorder.isRecording) return
      // 항상 제일 처음 녹음부터 전체 구간을 순서대로 재생
      setCurrentIndex(0)
      playFrom(0)
      return
    }
    if (type === 'rew') {
      if (recorder.isRecording) return
      const next = Math.max(0, currentIndex - 1)
      setCurrentIndex(next)
      if (player.playingId) playFrom(next)
      return
    }
    if (type === 'ff') {
      if (recorder.isRecording) return
      const next = Math.min(Math.max(0, segments.length - 1), currentIndex + 1)
      setCurrentIndex(next)
      if (player.playingId) playFrom(next)
    }
  }

  const handleFinishTape = async () => {
    if (!id) return
    setSaving(true)
    try {
      if (recorder.isRecording) await stopRecording()
      await updateTape(id, {})
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tape')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTape = async () => {
    if (!id) return
    const ok = window.confirm('이 테이프를 삭제하시겠어요? 모든 녹음이 사라져요.')
    if (!ok) return
    try {
      recorder.cancel()
      player.stop()
      await deleteTape(id)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tape')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f3f1] font-mix text-[14px] text-[#888]">
        loading...
      </div>
    )
  }

  if (error && !tape) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-[16px] bg-[#f5f3f1] text-[#222]">
        <p className="font-mix text-[14px]">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-[8px] bg-[#222] px-[16px] py-[8px] font-mix text-[13px] text-white"
        >
          돌아가기
        </button>
      </div>
    )
  }

  const activeTypes: Partial<Record<ControlType, boolean>> = {
    rew: pressedButton === 'rew',
    stop: pressedButton === 'stop',
    play: !!player.playingId,
    rec: recIntent,
    ff: pressedButton === 'ff',
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]">
      {/* ===== 상단 플레이어 데크 ===== */}
      <div className="relative w-full shrink-0">
        {/* 데크 본체: 393 폭에 맞춰 fill (높이 554). 검은 카세트 창·그릴 베이크됨 */}
        <img
          src={imgPlayerBody}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none block w-full select-none"
        />

        {/* 상태바 영역 (목업) */}
        <div className="absolute inset-x-0 top-0 flex h-[44px] items-center justify-between px-[24px]">
          <span className="font-mix text-[15px] text-[#222]">9:41</span>
        </div>

        {/* 헤더: 뒤로 / 제목(편집) / 더보기 */}
        <header className="absolute inset-x-0 top-[44px] flex h-[64px] items-center gap-[10px] px-[16px]">
          <button
            onClick={() => navigate('/')}
            className="flex size-[40px] shrink-0 items-center justify-center"
            aria-label="뒤로"
          >
            <img src={icBack} alt="" className="size-[24px]" />
          </button>
          <div className="min-w-px flex-1" aria-hidden />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-[36px] shrink-0 items-center justify-center outline-none" aria-label="더보기">
                <img src={icMore} alt="" className="size-[24px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[160px] border-[#e5e0d8] bg-white font-mix text-[#222]"
            >
              <DropdownMenuItem
                onSelect={() => {
                  /* 카세트 바꾸기 — 추후 구현 예정 */
                }}
                className="cursor-pointer text-[14px] focus:bg-[#f0ece4]"
              >
                카세트 바꾸기
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#e5e0d8]" />
              <DropdownMenuItem
                onSelect={() => void handleDeleteTape()}
                className="cursor-pointer text-[14px] text-[#C4383F] focus:bg-[#fceaea] focus:text-[#C4383F]"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* 카세트 이미지 + 사용자 문구 라벨 (헤더 바로 아래 y108, 가로 fill = 393×232) */}
        <div className="pointer-events-none absolute left-0 top-[98px] w-full">
          <img src={imgCassette} alt="" aria-hidden draggable={false} className="block w-full select-none" />
          {/* 문구: 카세트 레퍼런스 기준 x center / y 50, 최대 15자 (Figma: BM 꾸불림체 18px). 미입력 시 안내 문구 */}
          {tape ? (
            <p className="absolute inset-x-0 top-[50px] whitespace-nowrap text-center font-['BM_Kkubulim'] text-[18px] leading-normal text-black">
              {(tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER).slice(0, MAX_CAPTION_LENGTH)}
            </p>
          ) : null}
        </div>

        {/* VU 미터 */}
        <VuMeter
          stream={recorder.stream}
          audioEl={player.audioEl}
          className="absolute left-[37px] top-[331px] h-[46px] w-[82px]"
        />

        {/* 컨트롤 키캡 */}
        <PlayerControls
          activeTypes={activeTypes}
          onPress={(type) => {
            setPressedButton(type)
            handleButtonAction(type)
          }}
          onRelease={() => setPressedButton(null)}
          className="absolute left-1/2 top-[381px] -translate-x-1/2"
        />
      </div>

      {/* ===== 녹음 구간 리스트 (스크롤) — 데크 본체와 항상 20px 겹침 ===== */}
      <div className="relative z-10 -mt-[20px] flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}>
            {/* 리스트 헤더 (Figma node 101:10430: px-24 py-10, 38px) */}
            <div className="flex items-center justify-between px-[24px] py-[10px]">
              <p className="font-mix text-[12px] uppercase leading-[16px] text-[#888]">녹음 구간</p>
              <div className="flex items-center gap-[8px]">
                <span className="text-right font-mix text-[12px] leading-[18px] text-[#111]">
                  {formatClock(liveSeconds)}
                </span>
                <span className="h-[11px] w-px bg-[#c9c4bb]" />
                <span className="text-right font-mix text-[12px] leading-[18px] text-[#888]">{TOTAL_CLOCK}</span>
              </div>
            </div>

            <div className="flex flex-col gap-[8px] px-[20px]">
              {segments.length === 0 ? (
                <div className="flex h-[184px] w-full items-center justify-center rounded-[8px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <p className="font-mix text-[14px] text-[#b3aea6]">
                    기록하고 싶은 순간을 모아보세요
                  </p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={segments} onReorder={handleReorder} className="flex flex-col gap-[8px]">
                  <AnimatePresence initial={false}>
                    {segments.map((segment, index) => {
                      const focused =
                        player.playingId === segment.id ||
                        (!player.playingId && focusedIndex === index)
                      const anyFocused = !!player.playingId || focusedIndex !== null
                      return (
                        <SegmentRow
                          key={segment.id}
                          segment={segment}
                          index={index}
                          focused={focused}
                          dimmed={anyFocused && !focused}
                          onDelete={() => handleDeleteSegment(segment.id)}
                          onChange={(value) => handleSegmentMessage(segment.id, value)}
                          onTap={() => {
                            setFocusedIndex(index)
                            setCurrentIndex(index)
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              setSwipeOpenId(segment.id)
                              setFocusedIndex(null)
                              if (player.playingId) {
                                playQueueRef.current.stop = true
                                player.stop()
                              }
                            } else {
                              setSwipeOpenId((prev) => (prev === segment.id ? null : prev))
                            }
                          }}
                          onSwipeStart={() => {
                            setFocusedIndex(null)
                            if (player.playingId) {
                              playQueueRef.current.stop = true
                              player.stop()
                            }
                          }}
                          onLongPressStart={() => {
                            setFocusedIndex(null)
                            if (player.playingId) {
                              playQueueRef.current.stop = true
                              player.stop()
                            }
                          }}
                        />
                      )
                    })}
                  </AnimatePresence>
                </Reorder.Group>
              )}
              {error && <p className="font-mix text-[12px] text-[#C4383F]">{error}</p>}
            </div>
          </div>
        </div>

        {/* ===== 하단 전달하기 버튼 ===== */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="h-[30px] w-full bg-gradient-to-b from-[rgba(245,243,241,0)] to-[#f5f3f1]" />
          <div
            className="pointer-events-auto flex w-full flex-col items-center bg-[#f5f3f1] px-[20px] pt-[20px]"
            style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={handleFinishTape}
              disabled={saving || segments.length === 0}
              className="flex h-[56px] w-full items-center justify-center rounded-[8px] bg-[#222] disabled:bg-[#bdb8b0]"
            >
              <span className="font-mix text-[18px] leading-[25.5px] text-white">
                {saving ? '저장 중...' : '보내기'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  )
}

interface SegmentRowProps {
  segment: Segment
  index: number
  focused: boolean
  dimmed: boolean
  onDelete: () => void
  onChange: (value: string) => void
  onTap: () => void
  onOpenChange: (open: boolean) => void
  onSwipeStart: () => void
  onLongPressStart: () => void
}

function SegmentRow({
  segment,
  index,
  focused,
  dimmed,
  onDelete,
  onChange,
  onTap,
  onOpenChange,
  onSwipeStart,
  onLongPressStart,
}: SegmentRowProps) {
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={segment}
      dragListener={false}
      dragControls={dragControls}
      exit={{ x: -440, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
    >
      <SegmentItem
        count={(index + 1).toString()}
        message={segment.message}
        duration={formatClock(segment.duration_seconds)}
        isFocused={focused}
        dimmed={dimmed}
        onDelete={onDelete}
        onChange={onChange}
        onTap={onTap}
        onOpenChange={onOpenChange}
        onSwipeStart={onSwipeStart}
        onLongPress={(event) => {
          onLongPressStart()
          dragControls.start(event)
        }}
      />
    </Reorder.Item>
  )
}
