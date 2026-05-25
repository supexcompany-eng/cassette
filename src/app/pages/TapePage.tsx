import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Reorder } from 'motion/react'
import svgPaths from '../../imports/Main-1/svg-l1aok5pcy5'
import imgCassetteTape from '../../imports/Main-1/92592b07e4e86db60194b12fd429a4fc457cb9e9.png'
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
import type { Segment, Tape } from '../../lib/types'
import { useRecorder } from '../../hooks/useRecorder'
import { usePlayer } from '../../hooks/usePlayer'

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
  const [saving, setSaving] = useState(false)
  const [recIntent, setRecIntent] = useState(false)
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)

  const recorder = useRecorder()
  const player = usePlayer()

  const playQueueRef = useRef<{ stop: boolean }>({ stop: false })
  const editTimersRef = useRef<Map<string, number>>(new Map())

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

  const totalSeconds = useMemo(
    () => segments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
    [segments],
  )

  const headerTime = recorder.isRecording ? formatTime(recorder.elapsedSeconds) : formatTime(totalSeconds)

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
    if (player.playingId) player.stop()
    setRecIntent(true)
    try {
      await recorder.start()
    } catch (e) {
      setRecIntent(false)
      setError(e instanceof Error ? e.message : 'Microphone unavailable')
    }
  }, [id, player, recorder])

  const stopRecording = useCallback(async () => {
    if (!id) return
    setRecIntent(false)
    const result = await recorder.stop()
    if (!result) return
    try {
      const ext = result.mimeType.includes('mp4') ? 'mp4' : result.mimeType.includes('ogg') ? 'ogg' : 'webm'
      const path = await uploadAudio(id, result.blob, ext)
      const nextPosition = segments.length
      const inserted = await insertSegment({
        tape_id: id,
        position: nextPosition,
        message: '',
        duration_seconds: result.durationSeconds,
        audio_path: path,
      })
      setSegments((prev) => [...prev, inserted])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recording')
    }
  }, [id, recorder, segments.length])

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
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-[#888] font-['Sometype_Mono',monospace] text-[14px]">
        loading...
      </div>
    )
  }

  if (error && !tape) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-[16px] text-[#E1E1E1]">
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
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="w-[393px] h-[852px] bg-[#171717] text-[#E1E1E1] relative overflow-hidden">
        <div className="absolute bg-[#171717] flex h-[44px] items-center justify-between left-0 px-[24px] top-0 w-[393px] z-20">
          <div className="h-[22.5px] w-[36.125px]">
            <p className="font-['Sometype_Mono',monospace] leading-[22.5px] text-[15px] text-[#E1E1E1]">9:41</p>
          </div>
          <div className="h-[12px] w-[17px]">
            <svg className="block size-full" fill="none" viewBox="0 0 17 12">
              <path d={svgPaths.p25887600} stroke="#E1E1E1" strokeOpacity="0.35" />
              <path d={svgPaths.p1600e000} fill="#E1E1E1" />
              <path d={svgPaths.p10a18e00} fill="#E1E1E1" fillOpacity="0.4" />
            </svg>
          </div>
        </div>

        <div className="absolute bg-[#171717] flex h-[64px] items-center justify-between left-0 px-[12px] py-[16px] top-[44px] w-[393px] z-10">
          <button onClick={() => navigate('/')} className="relative rounded-[10px] size-[40px] p-[8px]">
            <IconBack />
          </button>
          <p className="flex-1 font-['Sometype_Mono',monospace] leading-[25.5px] text-[17px] text-[#e1e1e1] text-center">
            {tape?.title ?? 'tape'}
          </p>
          <button onClick={handleDeleteTape} className="relative rounded-[10px] size-[36px] p-[8px]">
            <IconDelete />
          </button>
        </div>

        <div className="absolute top-[108px] bottom-[148px] left-0 w-[393px] overflow-y-auto overflow-x-hidden">
          <div className="pb-[100px]">
            <div className="relative h-[232px] w-[393px]">
              <img
                alt="Cassette Tape"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[231.578px] w-[353px] object-cover"
                src={imgCassetteTape}
              />
            </div>

            <div className="flex items-center justify-between px-[20px] py-[10px] w-[393px]">
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

            <div className="flex flex-col gap-[10px] items-start w-[393px]">
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
                  <div className="border border-dashed border-[#2a2a2a] rounded-[8px] py-[24px] text-center">
                    <p className="font-['MaruBuri',sans-serif] text-[#515151] text-[12px]">
                      REC 버튼을 눌러 녹음을 시작하세요
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
                  {segments.map((segment, index) => {
                    const focused =
                      player.playingId === segment.id ||
                      (!player.playingId && index === currentIndex)
                    return (
                      <Reorder.Item
                        key={segment.id}
                        value={segment}
                        dragListener={swipeOpenId !== segment.id}
                      >
                        <Item
                          count={(index + 1).toString()}
                          message={segment.message}
                          duration={formatTime(segment.duration_seconds)}
                          isFocused={focused}
                          onDelete={() => handleDeleteSegment(segment.id)}
                          onChange={(value) => handleSegmentMessage(segment.id, value)}
                          onTap={() => setCurrentIndex(index)}
                          onOpenChange={(open) => {
                            if (open) {
                              setSwipeOpenId(segment.id)
                              if (player.playingId) {
                                playQueueRef.current.stop = true
                                player.stop()
                              }
                            } else {
                              setSwipeOpenId((prev) => (prev === segment.id ? null : prev))
                            }
                          }}
                          onInteractStart={() => {
                            if (player.playingId) {
                              playQueueRef.current.stop = true
                              player.stop()
                            }
                          }}
                        />
                      </Reorder.Item>
                    )
                  })}
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

        <div className="absolute bottom-0 h-[148px] left-0 w-[393px]">
          <div
            className="absolute h-[36px] left-0 top-0 w-[393px]"
            style={{
              background: 'linear-gradient(to bottom, rgba(23, 23, 23, 0) 0%, #171717 100%)',
            }}
          />
          <div className="absolute bg-[#171717] flex flex-col h-[112px] items-start left-0 pt-[24px] px-[20px] top-[36px] w-[393px]">
            <button
              onClick={handleFinishTape}
              disabled={saving}
              className="bg-[#e1e1e1] h-[56px] rounded-[8px] w-full relative disabled:opacity-50"
            >
              <p className="absolute left-1/2 -translate-x-1/2 font-['MaruBuriBold',sans-serif] leading-normal text-[#111] text-[17px] text-center top-[17.25px]">
                {saving ? '저장 중...' : '녹음 완료'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
