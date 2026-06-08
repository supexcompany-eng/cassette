import {
  getDesign,
  REEL_IMAGE,
  REEL_SHADOW,
  CASSETTE_BASE_W,
  CASSETTE_BASE_H,
  type ReelGeometry,
} from '../../lib/cassetteDesigns'

interface CassetteViewProps {
  designId: string | undefined
  /** 카세트 라벨에 노출할 문구 */
  caption?: string
  /** true면 생성·수정 화면용(create) 리소스 사용 + 릴 미표시. false면 재생용(player) + 릴 표시 */
  light?: boolean
  /** true면 양쪽 릴이 회전 (재생/녹음 중). false면 정지 상태로 노출. (player에서만 의미) */
  spinning?: boolean
  className?: string
}

/** 단일 릴(좌 또는 우): 공통 릴 이미지(회전) + 그 위에 공통 쉐도우(회전 안 함) */
function Reel({ cx, cy, size, spinning }: { cx: number; cy: number; size: number; spinning: boolean }) {
  // 393×232 기준 좌표 → CassetteView(%) 환산
  const left = (cx / CASSETTE_BASE_W) * 100
  const top = (cy / CASSETTE_BASE_H) * 100
  const widthPct = (size / CASSETTE_BASE_W) * 100
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%`, width: `${widthPct}%`, aspectRatio: '1 / 1' }}
    >
      <img
        src={REEL_IMAGE}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 size-full select-none animate-[spin_2s_linear_infinite]"
        // 정지 시 애니메이션을 제거하지 않고 일시정지 → 멈춘 각도 유지, 재개 시 그 자리에서 회전
        style={{ animationPlayState: spinning ? 'running' : 'paused' }}
      />
      {/* 공통 쉐도우 — 릴과 동일 박스에 정확히 겹침, 회전 안 함 */}
      <img src={REEL_SHADOW} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none" />
    </div>
  )
}

function Reels({ reel, spinning }: { reel: ReelGeometry; spinning: boolean }) {
  return (
    <>
      <Reel cx={reel.lx} cy={reel.ly} size={reel.size} spinning={spinning} />
      <Reel cx={reel.rx} cy={reel.ry} size={reel.size} spinning={spinning} />
    </>
  )
}

/**
 * 카세트 한 장. 393×232 비율을 채우며, 라벨 위치/크기가 cqw 단위로 자동 스케일된다.
 * - light(생성·수정): create 이미지, 릴 미표시
 * - 기본(재생): player 이미지 + 릴(재생/녹음 시 회전)
 */
export default function CassetteView({ designId, caption, light, spinning = false, className }: CassetteViewProps) {
  const d = getDesign(designId)
  const src = light ? d.createImage : d.playerImage
  return (
    <div className={`relative aspect-[393/232] w-full ${className ?? ''}`} style={{ containerType: 'inline-size' }}>
      <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none object-cover" />
      {!light ? <Reels reel={d.reel} spinning={spinning} /> : null}
      {caption ? (
        <p
          className={`pointer-events-none absolute inset-x-0 whitespace-nowrap text-center leading-normal text-black ${d.label.fontClass}`}
          style={{ top: `${(d.label.top / 232) * 100}%`, fontSize: `${(d.label.size / 393) * 100}cqw` }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
