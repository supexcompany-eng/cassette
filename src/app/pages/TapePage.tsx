import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, Reorder, useDragControls } from 'motion/react'
import svgPaths from '../../imports/Main-1/svg-l1aok5pcy5'
import BtnControl from '../../imports/BtnControl/BtnControl'
import IconBack from '../../imports/IconBack-1/IconBack'
import IconDelete from '../../imports/IconDelete-1/IconDelete'
import Item from '../../imports/Item-2/Item-19-1743'
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
import CassetteFace from '../components/CassetteFace'

const MAX_TAPE_SECONDS = 30 * 60
const MAX_TITLE_LENGTH = 10

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초`
}

type ButtonType = 'rew' | 'stop' | 'play' | 'rec' | 'ff'

export default function TapePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [tape, setTape] = useState<Tape | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pressedButton, setPressedButton] = useState<ButtonType | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [recIntent, setRecIntent] = useState(false)
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
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
  const headerTime = `${formatTime(liveSeconds)} / 30분`

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

  const handleButtonAction = (type: ButtonType) => {
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
      playFrom(currentIndex)
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

  const beginEditTitle = () => {
    if (!tape) return
    setTitleDraft(tape.title)
    setEditingTitle(true)
  }

  const commitTitle = async () => {
    if (!tape) {
      setEditingTitle(false)
      return
    }
    const trimmed = titleDraft.trim().slice(0, MAX_TITLE_LENGTH)
    setEditingTitle(false)
    if (!trimmed || trimmed === tape.title) return
    setTape({ ...tape, title: trimmed })
    try {
      await updateTape(tape.id, { title: trimmed })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update title')
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
      <div className="min-h-dvh bg-[#000000] flex items-center justify-center text-[#888] font-['Sometype_Mono',monospace] text-[14px]">
        loading...
      </div>
    )
  }

  if (error && !tape) {
    return (
      <div className="min-h-dvh bg-[#000000] flex flex-col items-center justify-center gap-[16px] text-[#E1E1E1]">
        <p className="font-['MaruBuri',sans-serif] text-[14px]">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-[#e1e1e1] text-[#111] px-[16px] py-[8px] rounded-[8px] font-['MaruBuriBold',sans-serif] text-[13px]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  const buttons: { type: ButtonType; label: string }[] = [
    { type: 'rew', label: 'rew' },
    { type: 'stop', label: 'stop' },
    { type: 'play', label: 'play' },
    { type: 'rec', label: 'rec' },
    { type: 'ff', label: 'ff' },
  ]

  return (
    <MobileFrame>
        <div
          className="shrink-0"
          style={{ height: 'max(env(safe-area-inset-top), 12px)' }}
        />

        <div className="flex items-center h-[64px] px-[12px] shrink-0 bg-[#171717] z-10">
          <button
            onClick={() => navigate('/')}
            className="size-[40px] shrink-0 flex items-center justify-center"
          >
            <IconBack />
          </button>
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              maxLength={MAX_TITLE_LENGTH}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  ;(e.target as HTMLInputElement).blur()
                } else if (e.key === 'Escape') {
                  setEditingTitle(false)
                }
              }}
              className="flex-1 bg-transparent font-['Sometype_Mono',monospace] leading-[27px] text-[18px] text-[#e1e1e1] text-center outline-none"
            />
          ) : (
            <p
              onClick={beginEditTitle}
              className="flex-1 font-['Sometype_Mono',monospace] leading-[27px] text-[18px] text-[#e1e1e1] text-center cursor-text"
            >
              {tape?.title ?? 'tape'}
            </p>
          )}
          <button
            onClick={handleDeleteTape}
            className="size-[40px] shrink-0 flex items-center justify-center"
          >
            <IconDelete />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
            <div
              style={{ paddingBottom: 'calc(148px + env(safe-area-inset-bottom))' }}
            >
            <div className="flex justify-center w-full h-[232px] items-center">
              <CassetteFace
                stickers={stickers}
                spinning={reelSpinning}
                overlay={
                  <button
                    type="button"
                    onClick={() => navigate(`/tape/${id}/decorate`)}
                    className="absolute top-[8px] right-[8px] z-20 flex h-[28px] items-center gap-[4px] rounded-full bg-[#171717]/85 px-[12px] font-['Sometype_Mono',monospace] text-[12px] text-[#e1e1e1] backdrop-blur-sm"
                  >
                    꾸미기
                  </button>
                }
              />
            </div>

            <div className="flex justify-center w-full py-[10px]">
              <div className="flex items-center justify-between w-[353px]">
                {buttons.map((btn) => (
                  <BtnControl
                    key={btn.type}
                    type={btn.type}
                    label={btn.label}
                    isPressed={
                      (btn.type === 'rec' && recIntent) ||
                      (btn.type === 'play' && !!player.playingId) ||
                      (pressedButton === btn.type && btn.type !== 'rec')
                    }
                    onPress={() => {
                      setPressedButton(btn.type)
                      handleButtonAction(btn.type)
                    }}
                    onRelease={() => setPressedButton(null)}
                    className="h-[74px] overflow-clip relative rounded-[8px] shrink-0 w-[70px] cursor-pointer"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[10px] items-start w-full">
              <div className="h-[24px] w-full px-[20px]">
                <div className="flex items-center justify-between px-[4px] size-full">
                  <p className="font-['MaruBuri',sans-serif] leading-[16px] text-[#888] text-[12px] uppercase">
                    녹음 구간
                  </p>
                  <p className="font-['Sometype_Mono',monospace] leading-[16px] text-[#888] text-[12px] text-right tracking-[1.2px] uppercase">
                    {headerTime}
                  </p>
                </div>
              </div>
              {segments.length === 0 ? (
                <div className="w-full px-[20px]">
                  <div className="bg-[#1c1c1c] h-[184px] rounded-[8px] flex items-center justify-center w-full">
                    <p className="font-['MaruBuri',sans-serif] font-normal leading-normal text-[#515151] text-[14px] whitespace-nowrap">
                      기록하고 싶은 순간을 모아보세요
                    </p>
                  </div>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={segments}
                  onReorder={handleReorder}
                  className="flex flex-col gap-[8px] w-full"
                >
                  <AnimatePresence initial={false}>
                    {segments.map((segment, index) => {
                      const focused =
                        player.playingId === segment.id ||
                        (!player.playingId && focusedIndex === index)
                      return (
                        <SegmentRow
                          key={segment.id}
                          segment={segment}
                          index={index}
                          focused={focused}
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
              {error && (
                <p className="px-[20px] text-[#C4383F] text-[12px] font-['MaruBuri',sans-serif]">
                  {error}
                </p>
              )}
            </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div
              className="h-[36px] w-full"
              style={{
                background: 'linear-gradient(to bottom, rgba(23, 23, 23, 0) 0%, #171717 100%)',
              }}
            />
            <div
              className="bg-[#171717] flex flex-col items-start pt-[24px] px-[20px] pointer-events-auto w-full"
              style={{
                paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
              }}
            >
              <button
                onClick={handleFinishTape}
                disabled={saving || segments.length === 0}
                className="bg-[#e1e1e1] disabled:bg-[#555555] h-[56px] rounded-[8px] w-full relative"
              >
                <p className="absolute left-1/2 -translate-x-1/2 font-['MaruBuriBold',sans-serif] leading-normal text-[#111] text-[16px] text-center top-[17.25px]">
                  {saving ? '저장 중...' : '전달하기'}
                </p>
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
      <Item
        count={(index + 1).toString()}
        message={segment.message}
        duration={formatTime(segment.duration_seconds)}
        isFocused={focused}
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
