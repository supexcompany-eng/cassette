import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
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
import { shareTape, SHARE_BASE_URL } from '../../lib/share'
import type { Segment, Tape } from '../../lib/types'
import { useRecorder } from '../../hooks/useRecorder'
import { usePlayer } from '../../hooks/usePlayer'
import MobileFrame from '../components/MobileFrame'
import PlayerControls, { type ControlType } from '../components/PlayerControls'
import VuMeter from '../components/VuMeter'
import SegmentItem from '../components/SegmentItem'
import NoteComposeSheet, { type NoteValues } from '../components/NoteComposeSheet'
import SharePreview from '../components/SharePreview'
import { ChevronRight } from 'lucide-react'
import icBack from '../../assets/ic_back.svg'
import icMore from '../../assets/ic_more.svg'
import imgPlayerBody from '../../assets/img_player_body_default.png'
import imgCassetteBg from '../../assets/img_player_cassettebg.png'
import imgHole from '../../assets/img_player_hole.png'
import CassetteView from '../components/CassetteView'
import { getNickname } from '../../lib/nickname'

const MAX_TAPE_SECONDS = 30 * 60
/** 카세트 라벨에 노출되는 사용자 문구의 최대 글자 수 (공백 포함 13자) */
const MAX_CAPTION_LENGTH = 13
/** 문구 미입력 시 카세트 라벨에 보여줄 안내 문구 */
const CAPTION_PLACEHOLDER = '최대글자수는열두자입니다'

// 재생 항목 자동 가운데 스크롤 시 하단에서 가려지는 영역(보내기 버튼 + 그라디언트)
const BOTTOM_OVERLAY_H = 140

// 수동 제스처 collapse 관련 (393 기준) — 제스처 발생 즉시 sticky로 스냅
const COLLAPSE_TRAVEL = 265 // 데크 콘텐츠·리스트·마스크가 함께 위로 이동하는 거리 (body·20px겹침 관계 유지)
const SCROLL_TRIGGER = 8 // 이만큼 휠/스와이프하면 즉시 collapse 스냅
const DESIGN_WIDTH = 393 // 플레이어 디자인 기준 폭 (내부 요소가 이 폭 기준 px로 배치됨)
const MIN_DECK_WIDTH = 320 // 플레이어 최소 표시 폭 — 320까지 비율 축소, 그 미만은 320 고정·가운데 정렬
const MAX_DECK_WIDTH = 430 // 플레이어 최대 표시 폭 — 430까지 비율 확대, 그 이상은 430 고정·가운데 정렬

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
  const [reorderingId, setReorderingId] = useState<string | null>(null) // 순서변경(롱프레스 드래그) 중인 항목
  const [saving, setSaving] = useState(false)
  const [recIntent, setRecIntent] = useState(false)
  const [, setSwipeOpenId] = useState<string | null>(null)
  const [deckH, setDeckH] = useState(544) // 데크(body) 시각 높이(=natural*scale) — 리스트 상단 여백/마스크 위치 기준
  const [scale, setScale] = useState(1) // 플레이어 확대 배율 (폭/393, 태블릿 상한에서 고정)
  const [collapseP, setCollapseP] = useState(0) // 0=펼침, 1=완전히 접힘 (수동 스크롤로만 변함)
  const [moreOpen, setMoreOpen] = useState(false) // 더보기 바텀시트
  // 공유 흐름: none → compose(쪽지쓰기) → preview(미리보기) ↔ editNote(쪽지수정)
  const [shareStep, setShareStep] = useState<'none' | 'compose' | 'preview' | 'editNote'>('none')
  const [noteValues, setNoteValues] = useState<NoteValues>({ to: '', note: '', from: '' })
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false) // 삭제 확인 다이얼로그

  const recorder = useRecorder()
  const player = usePlayer()

  const scrollRef = useRef<HTMLDivElement>(null)
  const deckWrapRef = useRef<HTMLDivElement>(null)
  const bodyImgRef = useRef<HTMLImageElement>(null)
  const playQueueRef = useRef<{ stop: boolean }>({ stop: false })
  const editTimersRef = useRef<Map<string, number>>(new Map())
  const totalAtRecStartRef = useRef(0)
  const autoStopTriggeredRef = useRef(false)
  const recIntentRef = useRef(false) // REC 눌렀지만 아직 0.5초 버퍼 중인 상태 포함 (취소 판정용)

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

  // 재생 시작/이동 시: 재생 중인 항목이 안전 영역(위 mask_top, 아래 보내기 버튼 제외) 밖이면
  // 리스트를 부드럽게 스크롤해 안전 영역 가운데로. 스크롤 여지가 없으면(전부 보임) 아무것도 안 함.
  useEffect(() => {
    const id = player.playingId
    const c = scrollRef.current
    if (!id || !c) return
    if (c.scrollHeight <= c.clientHeight + 1) return // 스크롤 불가 → 그대로
    const el = c.querySelector<HTMLElement>(`[data-seg-id="${id}"]`)
    if (!el) return
    const cRect = c.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const safeTop = deckH // 데크(body)에 가리는 영역
    const safeBottom = c.clientHeight - BOTTOM_OVERLAY_H // 하단 보내기 버튼/그라디언트에 가리는 영역
    const eTopRel = eRect.top - cRect.top
    const eBotRel = eRect.bottom - cRect.top
    // 위/아래 mask에 조금이라도 걸리면 가운데로 스크롤
    if (eTopRel >= safeTop && eBotRel <= safeBottom) return
    const itemCenterContent = eTopRel + c.scrollTop + eRect.height / 2
    const safeCenterScreen = (safeTop + safeBottom) / 2
    const target = itemCenterContent - safeCenterScreen
    // 프로그램적 스크롤이라 collapse 제스처(휠/터치)를 발생시키지 않음 → player 고정 유지
    c.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [player.playingId, deckH])

  // 가용 폭 → 플레이어 배율(scale) + 데크 시각 높이(deckH) 측정.
  // 폭 ≤ MAX_DECK_WIDTH: 폭에 맞춰 비율 확대 / 폭 > MAX: 상한에서 고정(가운데 정렬).
  const measureDeck = useCallback(() => {
    const w = deckWrapRef.current?.clientWidth ?? DESIGN_WIDTH
    // 320~430 구간만 폭에 비례, 밖이면 경계값으로 고정 (가운데 정렬은 mx-auto가 처리)
    const s = Math.max(MIN_DECK_WIDTH, Math.min(w, MAX_DECK_WIDTH)) / DESIGN_WIDTH
    setScale(s)
    const naturalH = bodyImgRef.current?.clientHeight ?? 544 // 393폭 기준 레이아웃 높이(≈544)
    setDeckH(naturalH * s)
  }, [])

  useEffect(() => {
    measureDeck()
    window.addEventListener('resize', measureDeck)
    return () => window.removeEventListener('resize', measureDeck)
  }, [measureDeck])

  // 펼침 상태: 리스트를 위로 스와이프하면 접힘 / 아래로 끌면 접지 않고 리스트가 스크롤.
  // (펼침일 땐 overflow hidden이라 아래 끌기는 수동 스크롤로 처리. 접힌 상태에선 네이티브 스크롤)
  const listTouchYRef = useRef(0) // 제스처 시작 Y (접힘 판정)
  const lastTouchYRef = useRef(0) // 직전 Y (증분 스크롤)
  const onListWheel = (e: { deltaY: number }) => {
    if (reorderingId) return
    if (collapseP === 0 && e.deltaY < -SCROLL_TRIGGER) setCollapseP(1) // 위로 → 접힘
  }
  const onListTouchStart = (e: { touches: ArrayLike<{ clientY: number }> }) => {
    listTouchYRef.current = e.touches[0]?.clientY ?? 0
    lastTouchYRef.current = listTouchYRef.current
  }
  const onListTouchMove = (e: { touches: ArrayLike<{ clientY: number }> }) => {
    if (reorderingId || collapseP !== 0) return // 접힌 상태에선 네이티브 스크롤
    const y = e.touches[0]?.clientY ?? 0
    const totalDy = y - listTouchYRef.current
    if (totalDy < -SCROLL_TRIGGER) {
      setCollapseP(1) // 위로 스와이프 → 접힘
      return
    }
    // 아래로 끌기 → 펼친 채로 리스트 수동 스크롤
    const el = scrollRef.current
    if (el) {
      const step = y - lastTouchYRef.current
      el.scrollTop = Math.max(0, el.scrollTop - step)
    }
    lastTouchYRef.current = y
  }

  // 접힘 상태: 카세트 바디를 아래로 끌면 펼침. (버튼 영역과 분리, 펼침 상태에선 무동작)
  const bodyDragYRef = useRef<number | null>(null)
  const onBodyDragStart = (e: { clientY: number }) => {
    if (collapseP === 0) return // 펼쳐져 있으면 바디 드래그 무시(접힘은 리스트로)
    bodyDragYRef.current = e.clientY
  }
  const onBodyDragMove = (e: { clientY: number }) => {
    if (bodyDragYRef.current == null) return
    const dy = e.clientY - bodyDragYRef.current
    if (dy > SCROLL_TRIGGER) {
      setCollapseP(0) // 끌어내림 → 펼침
      bodyDragYRef.current = null
    }
  }
  const onBodyDragEnd = () => {
    bodyDragYRef.current = null
  }

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
    recIntentRef.current = true
    try {
      // REC 클릭 효과음이 녹음 앞부분에 섞이지 않도록 0.5초 버퍼 후 실제 녹음 시작.
      // (버퍼 중 STOP 누르면 recIntentRef가 false가 되어 시작 취소)
      await new Promise((r) => setTimeout(r, 500))
      if (!recIntentRef.current) return
      await recorder.start()
    } catch (e) {
      setRecIntent(false)
      recIntentRef.current = false
      setError(e instanceof Error ? e.message : 'Microphone unavailable')
    }
  }, [id, player, recorder, totalSeconds])

  const stopRecording = useCallback(async () => {
    if (!id) return
    setRecIntent(false)
    recIntentRef.current = false // 버퍼 중이었다면 시작 취소
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

  // STOP 시점 기록 → PLAY 시 그 구간·위치부터 이어재생. 구간 선택/이동 시 무효화.
  const resumeRef = useRef<{ index: number; offset: number } | null>(null)

  const playFrom = useCallback(
    (startIndex: number, startOffset = 0) => {
      playQueueRef.current.stop = false
      const playable = segments.filter((s) => s.audio_path)
      if (playable.length === 0) return
      const startId = segments[startIndex]?.id
      const queueIndex = Math.max(
        0,
        playable.findIndex((s) => s.id === startId),
      )
      let i = queueIndex
      let offset = startOffset // 첫 구간만 이 오프셋부터, 이후 구간은 처음부터
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
        const segOffset = offset
        offset = 0
        player.play(
          url,
          seg.id,
          () => {
            i += 1
            playNext()
          },
          segOffset,
        )
      }
      playNext()
    },
    [player, segments],
  )

  const handleButtonAction = (type: ControlType) => {
    if (type === 'rec') {
      if (recorder.isRecording || recIntentRef.current) return
      void startRecording()
      return
    }
    if (type === 'stop') {
      if (recorder.isRecording || recIntentRef.current) {
        void stopRecording()
      } else {
        // 정지 지점(현재 구간 + 그 안에서의 위치) 기록 → 다음 PLAY 때 이어재생
        if (player.playingId) resumeRef.current = { index: currentIndex, offset: player.currentTime() }
        playQueueRef.current.stop = true
        player.stop()
        // 접힘/펼침은 바디 드래그로만 — STOP은 레이아웃을 건드리지 않음
      }
      return
    }
    if (type === 'play') {
      if (recorder.isRecording || recIntentRef.current) return
      if (player.playingId) return // 이미 재생 중이면 다시 눌러도 아무 동작 안 함(리셋 방지)
      // 정지했던 지점이 있으면 그 위치부터 이어재생
      if (resumeRef.current) {
        const { index, offset } = resumeRef.current
        resumeRef.current = null
        setCurrentIndex(index)
        playFrom(index, offset)
        return
      }
      // 선택(탭)한 구간부터 재생. 선택이 없으면 focusedIndex 없이 currentIndex(기본 0)부터.
      const startIndex = focusedIndex ?? currentIndex
      setCurrentIndex(startIndex)
      playFrom(startIndex)
      return
    }
    if (type === 'rew') {
      if (recorder.isRecording || recIntentRef.current) return
      resumeRef.current = null // 구간 이동 시 이어재생 지점 무효화
      const next = Math.max(0, currentIndex - 1)
      setCurrentIndex(next)
      if (player.playingId) playFrom(next)
      return
    }
    if (type === 'ff') {
      if (recorder.isRecording || recIntentRef.current) return
      resumeRef.current = null // 구간 이동 시 이어재생 지점 무효화
      const next = Math.min(Math.max(0, segments.length - 1), currentIndex + 1)
      setCurrentIndex(next)
      if (player.playingId) playFrom(next)
    }
  }

  // 보내기 → 쪽지쓰기 풀페이지 시트 오픈. 받는사람/내용은 항상 빈칸,
  // 보내는사람은 사용자 닉네임으로 프리필(수정 가능). (이전 쪽지는 복원하지 않음)
  const handleShare = async () => {
    if (!id) return
    if (recorder.isRecording) await stopRecording()
    playQueueRef.current.stop = true
    player.stop()
    setNoteValues({ to: '', note: '', from: getNickname() })
    setShareStep('compose')
  }

  // 쪽지를 DB에 저장 (미리보기 진입 시 호출 → 보내기 시점엔 이미 저장돼 있음)
  const persistNote = (values: NoteValues) => {
    if (!id) return
    void updateTape(id, {
      to_name: values.to,
      from_name: values.from,
      note: values.note,
      shared_at: new Date().toISOString(),
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to save note'))
    // OG 이미지 미리 생성·캐싱(워밍) → 받는 사람/메신저가 스크랩할 때 빠르게 응답(콜드 4초 회피)
    void fetch(`${SHARE_BASE_URL}/api/og?id=${id}`, { mode: 'no-cors' }).catch(() => {})
  }

  // 미리보기에서 보내기 → OS 공유 시트. navigator.share는 탭 제스처 안에서 동기 호출해야 하므로
  // 앞에 await를 두지 않는다(쪽지는 미리보기 진입 시 이미 저장됨).
  const handleSendShare = () => {
    if (!id) return
    void shareTape({ id, caption: tape?.caption })
  }

  const handleDeleteTape = async () => {
    if (!id) return
    try {
      recorder.cancel()
      player.stop()
      await deleteTape(id)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tape')
      setConfirmDeleteOpen(false)
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
    play: !!player.playingId || pressedButton === 'play', // 재생 중이 아니어도 누르면 눌림 효과
    rec: recIntent,
    ff: pressedButton === 'ff',
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      {/* ===== LIST (z-0, 맨 아래) — body 밑으로 스크롤 ===== */}
      <div
        ref={scrollRef}
        onWheel={onListWheel}
        onTouchStart={onListTouchStart}
        onTouchMove={onListTouchMove}
        className="absolute inset-0 z-0 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // 펼침: 사용자 스크롤 막음(overflow hidden) → 제스처는 collapse만. 단 재생 auto-scroll(프로그램적)은 동작.
        // 접힘: 리스트 스크롤 허용. 바운스(고무줄) 제거. 순서변경 중엔 스크롤 잠금(드래그와 충돌 방지).
        style={{ overflowY: collapseP && !reorderingId ? 'auto' : 'hidden', overscrollBehavior: 'none' }}
      >
        {/* 상단 여백 — body 바닥과 항상 20px 겹침. 접힘 시 데크와 동일하게 위로 시프트해 겹침 유지 */}
        <div
          className="transition-[padding] duration-300 ease-out"
          style={{
            paddingTop: deckH - 20 - collapseP * COLLAPSE_TRAVEL * scale,
            paddingBottom: 'calc(140px + env(safe-area-inset-bottom))',
          }}
        >
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
              <div className="flex h-[126px] w-full items-center justify-center rounded-[8px] bg-[#f0edea]">
                <p className="font-['MaruBuri'] text-[14px] text-[#b6b6b6]">기록하고 싶은 순간을 모아보세요</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={segments} onReorder={handleReorder} className="flex flex-col gap-[8px]">
                <AnimatePresence initial={false}>
                  {segments.map((segment, index) => {
                    const focused =
                      player.playingId === segment.id || (!player.playingId && focusedIndex === index)
                    return (
                      <SegmentRow
                        key={segment.id}
                        segment={segment}
                        index={index}
                        focused={focused}
                        dimmed={reorderingId !== null && reorderingId !== segment.id}
                        onReorderingChange={(r) =>
                          setReorderingId((prev) => (r ? segment.id : prev === segment.id ? null : prev))
                        }
                        onDelete={() => handleDeleteSegment(segment.id)}
                        onChange={(value) => handleSegmentMessage(segment.id, value)}
                        onTap={() => {
                          resumeRef.current = null // 다른 구간 선택 시 이어재생 지점 무효화
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

      {/* ===== mask_top (z-10, body와 list 사이) — 펼침: 데크 바닥 / 접힘: 컨트롤 바 바닥. 항상 노출 ===== */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 h-[52px] bg-gradient-to-t from-[20%] from-[rgba(245,243,241,0)] to-[70%] to-[#f5f3f1] transition-[top] duration-300 ease-out"
        style={{ top: deckH - 52 - collapseP * COLLAPSE_TRAVEL * scale }}
      />

      {/* ===== DECK / body (z-20, 맨 위 · 고정) — 래퍼는 풀폭(폭 측정용) ===== */}
      <div ref={deckWrapRef} className="pointer-events-none absolute inset-x-0 top-0 z-20">
        {/* 플레이어 고정폭(393) 박스를 scale로 통째 확대. left-1/2+translateX(-50%)로 폭과 무관하게 항상 가운데 */}
        <div
          className="absolute left-1/2 top-0 w-[393px]"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
        >
          {/* 접히는 그룹: body + 카세트 + VU + 컨트롤 (스크롤 시작 즉시 sticky로 스냅) */}
          <div
            className="transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${-collapseP * COLLAPSE_TRAVEL}px)`, willChange: 'transform' }}
          >
          {/* 바디 드래그 존 — 버튼(컨트롤 하단 ≈457) 바로 아래부터 데크 바닥(첫 리스트 위)까지.
              접힘 상태에서 여기를 아래로 끌면 펼쳐짐. (버튼·리스트와 겹치지 않음) */}
          <div
            className="pointer-events-auto absolute inset-x-0 bottom-0 top-[457px] z-[1] touch-none"
            onPointerDown={onBodyDragStart}
            onPointerMove={onBodyDragMove}
            onPointerUp={onBodyDragEnd}
            onPointerCancel={onBodyDragEnd}
            onPointerLeave={onBodyDragEnd}
          />

          {/* 데크 본체 (하단 52px 투명 — mask_top 구간) */}
          <img
            ref={bodyImgRef}
            src={imgPlayerBody}
            alt=""
            aria-hidden
            draggable={false}
            onLoad={measureDeck}
            className="pointer-events-none block w-full select-none"
          />

          {/* 카세트 창 배경 (카세트 뒤, Figma: 가운데 top116 287×192). 접힘 시 페이드아웃 */}
          <img
            src={imgCassetteBg}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-[116px] h-[192px] w-[287px] -translate-x-1/2 select-none transition-opacity duration-300 ease-out"
            style={{ opacity: 1 - collapseP }}
          />

          {/* 스피커 그릴 홀 (VU 오른쪽, Figma: left140 top331 216×46). 접힘 시 페이드아웃 */}
          <img
            src={imgHole}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute left-[140px] top-[331px] w-[216px] select-none transition-opacity duration-300 ease-out"
            style={{ opacity: 1 - collapseP }}
          />

          {/* 카세트 (선택한 디자인 + 문구 라벨, 접힘 시 페이드아웃) */}
          <div
            className="pointer-events-none absolute left-0 top-[98px] w-full transition-opacity duration-300 ease-out"
            style={{ opacity: 1 - collapseP }}
          >
            <CassetteView
              designId={tape?.design}
              spinning={reelSpinning}
              caption={
                tape ? (tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER).slice(0, MAX_CAPTION_LENGTH) : undefined
              }
            />
          </div>

          {/* VU 미터 (접힘 시 페이드아웃) */}
          <div
            className="absolute left-[37px] top-[331px] h-[46px] w-[82px] transition-opacity duration-300 ease-out"
            style={{ opacity: 1 - collapseP }}
          >
            <VuMeter stream={recorder.stream} playbackAnalyser={player.analyser} className="h-full w-full" />
          </div>

          {/* 컨트롤 키캡 */}
          <PlayerControls
            activeTypes={activeTypes}
            playing={!!player.playingId}
            onPress={(type) => {
              setPressedButton(type)
              handleButtonAction(type)
            }}
            onRelease={() => setPressedButton(null)}
            className="pointer-events-auto absolute left-1/2 top-[381px] -translate-x-1/2"
          />
          </div>
        </div>

        {/* 시스템 상태바 자리 (44px 공간만 — 데크 크림이 채움, 앱 출시 시 OS 상태바가 올라감) */}

        {/* 헤더: 뒤로 / 문구(접힘 시 노출) / 더보기 — 실제 상태바 아래(env) 고정 */}
        <header
          className="pointer-events-auto absolute inset-x-0 flex h-[64px] items-center gap-[10px] px-[16px]"
          style={{ top: 'env(safe-area-inset-top)' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex size-[40px] shrink-0 items-center justify-center"
            aria-label="뒤로"
          >
            <img src={icBack} alt="" className="size-[24px]" />
          </button>
          <p
            className="min-w-px flex-1 truncate text-center font-mix text-[19px] leading-[24px] text-[#222] transition-opacity duration-300 ease-out"
            style={{ opacity: collapseP }}
          >
            {tape ? (tape.caption.trim() ? tape.caption : CAPTION_PLACEHOLDER).slice(0, MAX_CAPTION_LENGTH) : ''}
          </p>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex size-[40px] shrink-0 items-center justify-center outline-none"
            aria-label="더보기"
          >
            <img src={icMore} alt="" className="size-[24px]" />
          </button>
        </header>
      </div>

      {/* ===== 하단 보내기 버튼 (z-30, 고정) ===== */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="h-[30px] w-full bg-gradient-to-b from-[rgba(245,243,241,0)] to-[#f5f3f1]" />
        <div
          className="pointer-events-auto flex w-full flex-col items-center bg-[#f5f3f1] px-[20px] pt-[20px]"
          style={{ paddingBottom: 'max(34px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleShare}
            disabled={saving || segments.length === 0}
            className="flex h-[56px] w-full items-center justify-center rounded-[8px] bg-[#222] disabled:bg-[#bdb8b0]"
          >
            <span className="font-mix text-[18px] leading-[25.5px] text-white">
              {saving ? '저장 중...' : '녹음 완료'}
            </span>
          </button>
        </div>
      </div>

      {/* ===== 더보기 바텀시트 (z-50) ===== */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 px-[16px]"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              className="w-full max-w-[361px] overflow-hidden rounded-[20px] bg-white pb-[20px]"
              initial={{ y: '120%' }}
              animate={{ y: 0 }}
              exit={{ y: '120%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 핸들 */}
              <div className="flex h-[24px] items-center justify-center">
                <div className="h-[4px] w-[50px] rounded-full bg-[#e0e0e0]" />
              </div>
              {/* 카세트 바꾸기 → 편집 모드 */}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  navigate(`/tape/${id}/edit`)
                }}
                className="flex h-[48px] w-full items-center gap-[20px] pl-[24px] pr-[4px]"
              >
                <span className="flex-1 text-left font-['Orbit'] text-[16px] text-[#111]">카세트 바꾸기</span>
                <span className="flex size-[40px] items-center justify-center">
                  <ChevronRight className="size-[14px] text-[#111]" strokeWidth={2.2} />
                </span>
              </button>
              {/* 카세트 삭제하기 → 확인 다이얼로그 */}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  setConfirmDeleteOpen(true)
                }}
                className="flex h-[48px] w-full items-center pl-[24px] pr-[4px]"
              >
                <span className="flex-1 text-left font-['Orbit'] text-[16px] text-[#f54c4c]">카세트 삭제하기</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 삭제 확인 다이얼로그 (z-50) ===== */}
      <AnimatePresence>
        {confirmDeleteOpen && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmDeleteOpen(false)}
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
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTape()}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 공유 흐름 (쪽지쓰기 / 미리보기) ===== */}
      {tape && (shareStep === 'compose' || shareStep === 'editNote') && (
        <NoteComposeSheet
          designId={tape.design}
          caption={tape.caption}
          segmentCount={segments.length}
          durationText={`${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초`}
          initial={noteValues}
          mode={shareStep === 'editNote' ? 'edit' : 'compose'}
          onClose={() => setShareStep(shareStep === 'editNote' ? 'preview' : 'none')}
          onSubmit={(v) => {
            setNoteValues(v)
            persistNote(v) // 미리보기 진입 시 쪽지 저장 → 보내기 때 공유시트만 호출(제스처 보존)
            setShareStep('preview')
          }}
        />
      )}
      {tape && shareStep === 'preview' && (
        <SharePreview
          tape={tape}
          segments={segments}
          values={noteValues}
          sending={saving}
          onClose={() => setShareStep('none')}
          onEditNote={() => setShareStep('editNote')}
          onSend={() => void handleSendShare()}
        />
      )}
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
  onReorderingChange: (reordering: boolean) => void
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
  onReorderingChange,
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
        segId={segment.id}
        count={(index + 1).toString()}
        message={segment.message}
        duration={formatClock(segment.duration_seconds)}
        isFocused={focused}
        dimmed={dimmed}
        onDelete={onDelete}
        onChange={onChange}
        onTap={onTap}
        onOpenChange={onOpenChange}
        onReorderingChange={onReorderingChange}
        onSwipeStart={onSwipeStart}
        onLongPress={(event) => {
          onLongPressStart()
          dragControls.start(event)
        }}
      />
    </Reorder.Item>
  )
}
