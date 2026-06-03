import type { CSSProperties, ReactNode } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'motion/react'
import imgCassetteTape from '../../assets/img_cassette_simple_3.png'
import imgReelLeft from '../../assets/img_cassette_simple_3_l.png'
import imgReelRight from '../../assets/img_cassette_simple_3_r.png'
import type { Sticker } from '../../lib/types'
import StickerLayer from './StickerLayer'

interface CassetteFaceProps {
  stickers: Sticker[]
  spinning: boolean
  /** true면 스티커를 드래그/크기/회전/삭제할 수 있음 */
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  onUpdate?: (id: string, patch: Partial<Sticker>) => void
  onDelete?: (id: string) => void
  /** 카세트 박스 위에 겹쳐 표시할 요소 (예: 꾸미기 버튼) */
  overlay?: ReactNode
}

const noop = () => {}

// 적용(표시) 상태에서 베이스+스티커 그룹에 씌우는 실루엣 마스크.
// 베이스 <img>의 object-cover(=cover/center)와 동일 정렬이라 카세트 모양에 정확히 맞물린다.
// iOS Safari 호환 위해 -webkit- prefix 동반.
const SILHOUETTE_MASK: CSSProperties = {
  WebkitMaskImage: `url(${imgCassetteTape})`,
  maskImage: `url(${imgCassetteTape})`,
  WebkitMaskSize: 'cover',
  maskSize: 'cover',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
}

/**
 * 카세트 한 면: 베이스 이미지 → 스티커 합성 레이어 → 회전 릴(별도 상단 레이어).
 * TapePage(표시 전용)와 DecoratePage(편집)가 공유한다.
 *
 * editable=false(적용 상태): 베이스+스티커를 한 그룹(isolation:isolate)으로 묶어
 *   - 카세트 실루엣 밖으로 삐져나온 스티커를 마스크로 크롭하고
 *   - 스티커가 카세트 면을 backdrop 삼아 블렌드되도록 한다.
 * editable=true(배치 중): 마스크 없이 자유 배치(밖으로 끌어내기 허용).
 */
export default function CassetteFace({
  stickers,
  spinning,
  editable = false,
  selectedId = null,
  onSelect,
  onUpdate,
  onDelete,
  overlay,
}: CassetteFaceProps) {
  const applied = !editable
  return (
    <div className="relative h-[231.578px] w-[353px]">
      <div
        className="absolute inset-0"
        // isolation: 적용 시 스티커 블렌드가 페이지 배경까지 새지 않도록 가두고,
        // 동시에 그룹 내부 z-index가 릴(zIndex:5) 위로 새어 올라가지 않게 막는다.
        style={{ isolation: 'isolate', ...(applied ? SILHOUETTE_MASK : null) }}
      >
        <img
          alt="Cassette Tape"
          className="absolute inset-0 h-full w-full object-cover"
          src={imgCassetteTape}
        />
        <StickerLayer
          stickers={stickers}
          editable={editable}
          applied={applied}
          selectedId={selectedId}
          onSelect={onSelect ?? noop}
          onUpdate={onUpdate ?? noop}
          onDelete={onDelete ?? noop}
        />
      </div>
      <CassetteReel spinning={spinning} side="left" />
      <CassetteReel spinning={spinning} side="right" />
      {overlay}
    </div>
  )
}

interface CassetteReelProps {
  spinning: boolean
  side: 'left' | 'right'
}

const REEL_DEG_PER_MS = 360 / 2400

function CassetteReel({ spinning, side }: CassetteReelProps) {
  const leftPct = side === 'left' ? 33.45 : 66.26
  const src = side === 'left' ? imgReelLeft : imgReelRight
  const rotation = useMotionValue(0)

  useAnimationFrame((_, delta) => {
    if (!spinning) return
    rotation.set(rotation.get() + delta * REEL_DEG_PER_MS)
  })

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: 32,
        height: 32,
        left: `${leftPct}%`,
        top: '46.34%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5, // 스티커 레이어(zIndex:1)보다 위 — 릴이 합성 위에 유지
      }}
    >
      <motion.img
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className="block h-full w-full select-none"
        style={{ rotate: rotation, transformOrigin: 'center' }}
      />
    </div>
  )
}
