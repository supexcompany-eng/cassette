import imgSimple1 from '../assets/img_cassette_simple_1.png'
import imgSimple2 from '../assets/img_cassette_simple_2.png'
import imgSimple2Light from '../assets/img_cassette_simple_2_light.png'
import imgSimple3 from '../assets/img_cassette_simple_3.png'
import imgSimple3Light from '../assets/img_cassette_simple_3_light.png'
import imgKitch1 from '../assets/img_cassette_kitch_1.png'
import imgKitch2 from '../assets/img_cassette_kitch_2.png'

export interface CassetteDesign {
  id: string
  image: string
  /** 라이트 버전 리소스 (생성 화면 등에서 사용). 없으면 image 사용 */
  lightImage?: string
  /** 카세트 라벨(문구) 스타일 — 393×232 카세트 기준 px/위치 (CassetteView가 cqw로 스케일) */
  label: { fontClass: string; size: number; top: number }
}

const ORBIT = "font-['Orbit']"
const KKUBULIM = "font-['BM_Kkubulim']"

// Figma 121:16562~16566 의 라벨 스펙
export const CASSETTE_DESIGNS: CassetteDesign[] = [
  { id: 'simple_1', image: imgSimple1, label: { fontClass: ORBIT, size: 13, top: 59 } },
  { id: 'simple_2', image: imgSimple2, lightImage: imgSimple2Light, label: { fontClass: ORBIT, size: 13, top: 58 } },
  { id: 'simple_3', image: imgSimple3, lightImage: imgSimple3Light, label: { fontClass: KKUBULIM, size: 18, top: 51 } },
  { id: 'kitch_1', image: imgKitch1, label: { fontClass: KKUBULIM, size: 14, top: 60 } },
  { id: 'kitch_2', image: imgKitch2, label: { fontClass: KKUBULIM, size: 14, top: 63 } },
]

export const DEFAULT_DESIGN_ID = 'simple_3'

export function getDesign(id: string | undefined): CassetteDesign {
  return CASSETTE_DESIGNS.find((d) => d.id === id) ?? CASSETTE_DESIGNS.find((d) => d.id === DEFAULT_DESIGN_ID)!
}
