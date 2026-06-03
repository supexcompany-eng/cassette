import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Sticker } from '../../lib/types'
import { resolveStickerUrl } from '../stickers/presets'
import imgCassetteTape from '../../assets/img_cassette_simple_3.png'

/** 스티커 기준 크기(px). scale 1.0 기준. */
const BASE_SIZE = 80
export const MIN_SCALE = 0.5 // 최소 40px
export const MAX_SCALE = 3.5 // 최대 280px

// 배치 중: 떠 있는 듯한 부드러운 그림자(스티커를 또렷이 인지).
const SHADOW_EDIT = 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
// 적용 후: 카세트에 밀착된 듯한 짧은 접촉 그림자.
const SHADOW_APPLIED = 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))'
// 적용 후 스티커를 살짝 무광·반투명하게 → 카세트 표면 질감이 비치고 채도가 가라앉아 묻힌다.
const MATTE_FILTER = 'saturate(0.95) brightness(0.98)'
const STICKER_OPACITY_APPLIED = 0.96

// ── 라이팅 트랜스퍼: 카세트의 실제 빛/그림자를 스티커 위로 옮겨 입힌다 ──
// 스티커마다 "그 자리의 카세트 픽셀"을 soft-light로 합성해, 카세트 어두운 곳의
// 스티커는 어두워지고 밝은 곳은 밝아진다. world-space라 회전과 무관하게 빛 방향이 일치한다.
const LIGHT_BLEND = 'soft-light'
const LIGHT_OPACITY = 0.9

// 카세트 면(베이스 <img object-cover>)의 기하 — 라이팅 샘플 좌표 계산용.
const FACE_W = 353
const FACE_H = 231.578
const CASSETTE_NAT_W = 786
const CASSETTE_NAT_H = 464
// object-cover = max-scale로 면을 덮고 중앙 정렬 → 베이스 이미지와 동일 매핑.
const COVER_SCALE = Math.max(FACE_W / CASSETTE_NAT_W, FACE_H / CASSETTE_NAT_H)
const COVER_W = CASSETTE_NAT_W * COVER_SCALE
const COVER_H = CASSETTE_NAT_H * COVER_SCALE
const COVER_OFFSET_X = (FACE_W - COVER_W) / 2
const COVER_OFFSET_Y = (FACE_H - COVER_H) / 2

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

interface BoxRef {
  current: HTMLDivElement | null
}

interface Baseline {
  x: number
  y: number
  scale: number
  rotation: number
  rectW: number
  rectH: number
  // 한 손가락(이동)
  anchorX: number
  anchorY: number
  // 두 손가락(핀치/회전)
  dist: number
  angle: number
  midX: number
  midY: number
}

interface StickerItemProps {
  sticker: Sticker
  editable: boolean
  /** 적용(표시) 상태 — 밀착 그림자 + 광택 블렌드로 합성된 모습. */
  applied: boolean
  selected: boolean
  boxRef: BoxRef
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Sticker>) => void
  onDelete: (id: string) => void
}

function StickerItem({
  sticker,
  editable,
  applied,
  selected,
  boxRef,
  onSelect,
  onUpdate,
  onDelete,
}: StickerItemProps) {
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const base = useRef<Baseline | null>(null)
  const handleDragging = useRef(false)
  // 스티커 원본 세로/가로 비율 — 라이팅 오버레이의 카세트 샘플 좌표 계산에 필요.
  const [ratio, setRatio] = useState(1)

  const recomputeBaseline = () => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const pts = [...pointers.current.values()]
    const b: Baseline = {
      x: sticker.x,
      y: sticker.y,
      scale: sticker.scale,
      rotation: sticker.rotation,
      rectW: r.width || 1,
      rectH: r.height || 1,
      anchorX: 0,
      anchorY: 0,
      dist: 1,
      angle: 0,
      midX: 0,
      midY: 0,
    }
    if (pts.length === 1) {
      b.anchorX = pts[0].x
      b.anchorY = pts[0].y
    } else if (pts.length >= 2) {
      const [p0, p1] = pts
      b.dist = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1
      b.angle = Math.atan2(p1.y - p0.y, p1.x - p0.x)
      b.midX = (p0.x + p1.x) / 2
      b.midY = (p0.y + p1.y) / 2
    }
    base.current = b
  }

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (!editable) return
    e.stopPropagation()
    onSelect(sticker.id)
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    recomputeBaseline()
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const b = base.current
    if (!b) return
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      const dx = pts[0].x - b.anchorX
      const dy = pts[0].y - b.anchorY
      onUpdate(sticker.id, {
        x: clamp01(b.x + dx / b.rectW),
        y: clamp01(b.y + dy / b.rectH),
      })
    } else if (pts.length >= 2) {
      const [p0, p1] = pts
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x)
      const midX = (p0.x + p1.x) / 2
      const midY = (p0.y + p1.y) / 2
      onUpdate(sticker.id, {
        scale: clamp((b.scale * dist) / b.dist, MIN_SCALE, MAX_SCALE),
        rotation: b.rotation + ((angle - b.angle) * 180) / Math.PI,
        x: clamp01(b.x + (midX - b.midX) / b.rectW),
        y: clamp01(b.y + (midY - b.midY) / b.rectH),
      })
    }
  }

  const endPointer = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (pointers.current.size > 0) recomputeBaseline()
    else base.current = null
  }

  // 데스크톱(마우스)용 크기·회전 핸들
  const handleHandleDown = (e: ReactPointerEvent) => {
    if (!editable) return
    e.stopPropagation()
    onSelect(sticker.id)
    handleDragging.current = true
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handleHandleMove = (e: ReactPointerEvent) => {
    if (!handleDragging.current) return
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const cx = r.left + sticker.x * r.width
    const cy = r.top + sticker.y * r.height
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    // 모서리(핸들)까지 거리 = (폭/2)*√2  →  폭 = dist*√2
    const width = dist * Math.SQRT2
    onUpdate(sticker.id, {
      scale: clamp(width / BASE_SIZE, MIN_SCALE, MAX_SCALE),
      rotation: (Math.atan2(dy, dx) * 180) / Math.PI - 45,
    })
  }

  const handleHandleUp = (e: ReactPointerEvent) => {
    handleDragging.current = false
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const url = resolveStickerUrl(sticker)
  const width = BASE_SIZE * sticker.scale

  // 라이팅 오버레이가 보여줄 "스티커 자리의 카세트 픽셀" 위치 계산.
  // 스티커 중심(면 px) 기준으로 카세트 이미지를 역오프셋해, 그 자리의 명암이 스티커에 입혀진다.
  const boxH = width * ratio
  const cx = sticker.x * FACE_W
  const cy = sticker.y * FACE_H
  const lightBgX = COVER_OFFSET_X - (cx - width / 2)
  const lightBgY = COVER_OFFSET_Y - (cy - boxH / 2)

  return (
    <div
      data-sticker-id={sticker.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      className="absolute select-none"
      style={{
        left: `${sticker.x * 100}%`,
        top: `${sticker.y * 100}%`,
        width,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
        transformOrigin: 'center',
        touchAction: 'none',
        pointerEvents: editable ? 'auto' : 'none',
        zIndex: sticker.z,
        cursor: editable ? 'move' : 'default',
      }}
    >
      {url ? (
        <>
          <img
            src={url}
            alt=""
            draggable={false}
            className="block w-full h-auto pointer-events-none"
            style={{ filter: applied ? SHADOW_APPLIED : SHADOW_EDIT }}
          />
          {applied && (
            // 스티커 표면 광택/음영. 스티커 alpha로 마스킹해 사각 잔상 없이 모양에만 입힌다.
            // 부모 wrapper의 transform이 스태킹 컨텍스트라, overlay 블렌드는 스티커 픽셀에만 작용한다.
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: SHEEN_GRADIENT,
                mixBlendMode: 'overlay',
                WebkitMaskImage: `url(${url})`,
                maskImage: `url(${url})`,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
              }}
            />
          )}
        </>
      ) : (
        <div className="aspect-square w-full rounded-[8px] bg-[#2a2a2a] pointer-events-none" />
      )}

      {editable && selected && (
        <>
          <div className="absolute inset-0 rounded-[4px] border-2 border-dashed border-[#e1e1e1]/80 pointer-events-none" />
          <button
            type="button"
            aria-label="스티커 삭제"
            onPointerDown={(e) => {
              e.stopPropagation()
              onDelete(sticker.id)
            }}
            className="absolute -top-[11px] -left-[11px] size-[22px] rounded-full bg-[#C4383F] text-white flex items-center justify-center leading-none"
            style={{ touchAction: 'none' }}
          >
            <span className="text-[13px] -mt-[1px]">×</span>
          </button>
          <div
            aria-label="크기·회전"
            onPointerDown={handleHandleDown}
            onPointerMove={handleHandleMove}
            onPointerUp={handleHandleUp}
            onPointerCancel={handleHandleUp}
            className="absolute -bottom-[11px] -right-[11px] size-[22px] rounded-full bg-[#e1e1e1] flex items-center justify-center cursor-nwse-resize"
            style={{ touchAction: 'none' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20L20 4M20 4v6M20 4h-6M4 20v-6M4 20h6" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}

interface StickerLayerProps {
  stickers: Sticker[]
  editable: boolean
  applied: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Sticker>) => void
  onDelete: (id: string) => void
}

export default function StickerLayer({
  stickers,
  editable,
  applied,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
}: StickerLayerProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={boxRef}
      className="absolute inset-0"
      // 독립 스태킹 컨텍스트(isolation)는 부모(CassetteFace의 그룹)가 담당한다.
      // 여기서 z-index를 만들면 스티커가 카세트 면을 backdrop으로 인식하지 못해 블렌드가 깨지므로
      // 일부러 z-index를 두지 않는다. (position만으로는 스태킹 컨텍스트가 생기지 않음)
      style={{ pointerEvents: editable ? 'auto' : 'none' }}
      onPointerDown={editable ? () => onSelect('') : undefined}
    >
      {stickers.map((sticker) => (
        <StickerItem
          key={sticker.id}
          sticker={sticker}
          editable={editable}
          applied={applied}
          selected={selectedId === sticker.id}
          boxRef={boxRef}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
