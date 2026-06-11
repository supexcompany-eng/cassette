import { useEffect, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'motion/react'
import imgVuBg from '../../assets/img_player_vu_bg.png'
import imgVuGlass from '../../assets/img_player_vu_glass.png'
import imgVuPin from '../../assets/img_player_vu_pin.png'
import { getSharedAudioContext } from '../../lib/audioContext'

interface VuMeterProps {
  /** 녹음 중인 마이크 스트림 (있으면 이쪽 레벨을 분석) */
  stream?: MediaStream | null
  /** 재생 중인 오디오 분석기 (usePlayer가 play 전에 연결한 AnalyserNode). 있으면 이쪽 레벨을 분석 */
  playbackAnalyser?: AnalyserNode | null
  className?: string
}

// 바늘 회전 범위(도). 무신호=왼쪽 끝, 최대=오른쪽 끝.
const ANGLE_MIN = -42
const ANGLE_MAX = 42

/**
 * 아날로그 VU 미터. WebAudio AnalyserNode로 마이크(녹음)/재생 오디오의 RMS 레벨을 읽어
 * 바늘(vu_pin)을 회전시킨다. vu_bg(눈금판) → pin(바늘) → vu_glass(유리 반사) 순으로 합성.
 *
 * - 녹음: 이 컴포넌트가 stream으로 자체 분석기를 만든다.
 * - 재생: usePlayer가 play() 전에 연결해 둔 playbackAnalyser를 그대로 읽는다.
 */
export default function VuMeter({ stream, playbackAnalyser, className }: VuMeterProps) {
  const angle = useMotionValue(ANGLE_MIN)

  const ctxRef = useRef<AudioContext | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataRef = useRef<Uint8Array | null>(null)
  const smoothedRef = useRef(0)

  // 마이크 스트림 연결 (녹음 경로)
  useEffect(() => {
    if (!stream) {
      streamSourceRef.current?.disconnect()
      streamSourceRef.current = null
      return
    }
    const ctx = getSharedAudioContext() // 공유 컨텍스트 (별도 생성 시 iOS 다중 컨텍스트 충돌)
    ctxRef.current = ctx
    void ctx.resume()
    if (!micAnalyserRef.current) {
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      an.smoothingTimeConstant = 0.6
      micAnalyserRef.current = an
    }
    const src = ctx.createMediaStreamSource(stream)
    src.connect(micAnalyserRef.current) // destination 연결 안 함 (마이크 하울링 방지)
    streamSourceRef.current = src
    return () => {
      src.disconnect()
      if (streamSourceRef.current === src) streamSourceRef.current = null
    }
  }, [stream])

  useEffect(() => {
    return () => {
      // 공유 컨텍스트는 close하지 않는다. 이 컴포넌트가 만든 노드만 분리.
      try {
        streamSourceRef.current?.disconnect()
      } catch {
        // ignore
      }
      try {
        micAnalyserRef.current?.disconnect()
      } catch {
        // ignore
      }
      streamSourceRef.current = null
      micAnalyserRef.current = null
      ctxRef.current = null
    }
  }, [])

  useAnimationFrame(() => {
    // 녹음 중이면 마이크 분석기, 아니면 재생 분석기 사용
    const analyser = stream ? micAnalyserRef.current : playbackAnalyser ?? null
    let target = 0
    if (analyser) {
      if (!dataRef.current || dataRef.current.length !== analyser.fftSize) {
        dataRef.current = new Uint8Array(analyser.fftSize)
      }
      const data = dataRef.current
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
