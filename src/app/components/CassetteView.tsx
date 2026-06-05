import { getDesign } from '../../lib/cassetteDesigns'

interface CassetteViewProps {
  designId: string | undefined
  /** 카세트 라벨에 노출할 문구 */
  caption?: string
  /** 라이트 버전 리소스 사용 (생성 화면). 라이트가 없는 디자인은 일반 리소스로 폴백 */
  light?: boolean
  className?: string
}

/**
 * 카세트 한 장(이미지 + 디자인별 라벨 문구). 393×232 비율을 채우며,
 * 컨테이너 너비에 맞춰 라벨 위치/크기가 cqw 단위로 자동 스케일된다.
 */
export default function CassetteView({ designId, caption, light, className }: CassetteViewProps) {
  const d = getDesign(designId)
  const src = light ? d.lightImage ?? d.image : d.image
  return (
    <div
      className={`relative aspect-[393/232] w-full ${className ?? ''}`}
      style={{ containerType: 'inline-size' }}
    >
      <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none object-cover" />
      {caption ? (
        <p
          className={`pointer-events-none absolute inset-x-0 whitespace-nowrap text-center leading-none text-black ${d.label.fontClass}`}
          style={{ top: `${(d.label.top / 232) * 100}%`, fontSize: `${(d.label.size / 393) * 100}cqw` }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
