import { useEffect, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'motion/react'
import imgVuBg from '../../assets/img_player_vu_bg.png'
import imgVuGlass from '../../assets/img_player_vu_glass.png'
import imgVuPin from '../../assets/img_player_vu_pin.png'

interface VuMeterProps {
  /** 녹음 중인 마이크 스트림 (있으면 이쪽 레벨을 분석) */
  stream?: MediaStream | null
  /** 재생 중인 오디오 엘리먼트 (있으면 이쪽 레벨을 분석) */
  audioEl?: HTMLAudioElement | null
  className?: string
}

// 바늘 회전 범위(도). 무신호=왼쪽 끝, 최대=오른쪽 끝.
const ANGLE_MIN = -42
const ANGLE_MAX = 42

/**
 * 아날로그 VU 미터. WebAudio AnalyserNode로 마이크/재생 오디오의 RMS 레벨을 읽어
 * 바늘(vu_pin)을 회전시킨다. vu_bg(눈금판) → pin(바늘) → vu_glass(유리 반사) 순으로 합성.
 *
 * 재생 오디오는 cross-origin(CORS) 헤더가 있어야 분석 가능하다. 분석이 막히면(무음 데이터)
 * 바늘은 0에 머문다 — 재생 자체는 정상 동작.
 */
export default function VuMeter({ stream, audioEl, className }: VuMeterProps) {
  const angle = useMotionValue(ANGLE_MIN)

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array | null>(null)
  // MediaElementSource는 엘리먼트당 1개만 생성 가능 → 캐시
  const elSourceRef = useRef<{ el: HTMLAudioElement; node: MediaElementAudioSourceNode } | null>(null)
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const smoothedRef = useRef(0)

  const getCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new Ctx()
    }
    return ctxRef.current
  }

  const ensureAnalyser = (ctx: AudioContext) => {
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      analyserRef.current = analyser
      dataRef.current = new Uint8Array(analyser.fftSize)
    }
    return analyserRef.current
  }

  // 마이크 스트림 연결
  useEffect(() => {
    if (!stream) {
      streamSourceRef.current?.disconnect()
      streamSourceRef.current = null
      return
    }
    const ctx = getCtx()
    void ctx.resume()
    const analyser = ensureAnalyser(ctx)
    const src = ctx.createMediaStreamSource(stream)
    src.connect(analyser) // destination 연결 안 함 (마이크 하울링 방지)
    streamSourceRef.current = src
    return () => {
      src.disconnect()
      if (streamSourceRef.current === src) streamSourceRef.current = null
    }
  }, [stream])

  // 재생 오디오 연결
  useEffect(() => {
    if (!audioEl) return
    const ctx = getCtx()
    void ctx.resume()
    const analyser = ensureAnalyser(ctx)
    let node = elSourceRef.current?.el === audioEl ? elSourceRef.current.node : null
    if (!node) {
      try {
        node = ctx.createMediaElementSource(audioEl)
        elSourceRef.current = { el: audioEl, node }
      } catch {
        return // 이미 소스가 있는 엘리먼트 등 — 분석 생략
      }
    }
    node.connect(analyser)
    analyser.connect(ctx.destination) // 재생음이 들리도록 destination 연결 필수
    return () => {
      try {
        analyser.disconnect(ctx.destination)
      } catch {
        // ignore
      }
    }
  }, [audioEl])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
      ctxRef.current = null
      analyserRef.current = null
    }
  }, [])

  useAnimationFrame(() => {
    const analyser = analyserRef.current
    const data = dataRef.current
    const active = !!stream || !!audioEl
    let target = 0
    if (active && analyser && data) {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      // RMS(보통 0~0.4)를 0~1로 끌어올리고 살짝 압축
      target = Math.min(1, Math.pow(rms * 3.2, 0.7))
    }
    // 비대칭 스무딩: 빠르게 튀고 천천히 가라앉음
    const cur = smoothedRef.current
    const k = target > cur ? 0.5 : 0.12
    const next = cur + (target - cur) * k
    smoothedRef.current = next
    angle.set(ANGLE_MIN + (ANGLE_MAX - ANGLE_MIN) * next)
  })

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <img src={imgVuBg} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full select-none" />
        {/* 바늘: 게이지 하단 중앙을 축으로 회전 */}
        <motion.img
          src={imgVuPin}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute bottom-[2px] left-1/2 h-[78%] w-auto select-none"
          style={{ transformOrigin: 'bottom center', x: '-50%', rotate: angle }}
        />
        <img src={imgVuGlass} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full select-none" />
      </div>
    </div>
  )
}
