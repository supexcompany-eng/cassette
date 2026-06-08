// 재생(플레이어) 화면용 카세트 리소스
import playerSimple1 from '../assets/img_cassette_player_simple1.png'
import playerSimple2 from '../assets/img_cassette_player_simple2.png'
import playerSimple3 from '../assets/img_cassette_player_simple3.png'
import playerKitch1 from '../assets/img_cassette_player_kitch1.png'
import playerKitch2 from '../assets/img_cassette_player_kitch2.png'

// 생성·수정 화면용 카세트 리소스
import createSimple1 from '../assets/img_cassette_create_simple1.png'
import createSimple2 from '../assets/img_cassette_create_simple2.png'
import createSimple3 from '../assets/img_cassette_create_simple3.png'
import createKitch1 from '../assets/img_cassette_create_kitch1.png'
import createKitch2 from '../assets/img_cassette_create_kitch2.png'

// 릴/쉐도우 — 모든 디자인·좌우 공통 단일 리소스
import reelImage from '../assets/img_cassette_reel.png'
import reelShadow from '../assets/img_cassette_reel_shadow.png'

/**
 * 릴 기하. 좌표/크기는 카세트 리소스 기준 393×232 좌표계.
 *  - lx/ly, rx/ry: 좌/우 릴의 "중심" 좌표 (Figma 노드에서 추출)
 *  - size: 릴 정사각 크기
 */
export interface ReelGeometry {
  size: number
  lx: number
  ly: number
  rx: number
  ry: number
}

export interface CassetteDesign {
  id: string
  /** 재생 화면용 이미지 */
  playerImage: string
  /** 생성·수정 화면용 이미지 */
  createImage: string
  /** 카세트 라벨(문구) 스타일 — 393×232 카세트 기준 px/위치 (CassetteView가 cqw로 스케일) */
  label: { fontClass: string; size: number; top: number }
  /** 회전 릴 위치 (재생/녹음 시 회전) */
  reel: ReelGeometry
}

const ORBIT = "font-['Orbit']"
const KKUBULIM = "font-['BM_Kkubulim']"

// 릴 좌표: Figma 노드(214:6598/6599/6603/6670/6671)에서 추출, 393×232 기준 중심 좌표.
export const CASSETTE_DESIGNS: CassetteDesign[] = [
  {
    id: 'simple_1',
    playerImage: playerSimple1,
    createImage: createSimple1,
    label: { fontClass: ORBIT, size: 13, top: 58 },
    reel: { size: 31, lx: 138.5, ly: 108.56, rx: 255.7, ry: 108.56 },
  },
  {
    id: 'simple_2',
    playerImage: playerSimple2,
    createImage: createSimple2,
    label: { fontClass: ORBIT, size: 13, top: 58 },
    reel: { size: 31, lx: 137.5, ly: 108.5, rx: 255.7, ry: 108.5 },
  },
  {
    id: 'simple_3',
    playerImage: playerSimple3,
    createImage: createSimple3,
    label: { fontClass: KKUBULIM, size: 18, top: 48 },
    reel: { size: 31, lx: 138.5, ly: 107.5, rx: 254.7, ry: 107.5 },
  },
  {
    id: 'kitch_1',
    playerImage: playerKitch1,
    createImage: createKitch1,
    label: { fontClass: KKUBULIM, size: 14, top: 52 },
    reel: { size: 31, lx: 142.5, ly: 104.56, rx: 253.7, ry: 104.56 },
  },
  {
    id: 'kitch_2',
    playerImage: playerKitch2,
    createImage: createKitch2,
    label: { fontClass: KKUBULIM, size: 14, top: 60 },
    reel: { size: 31, lx: 137.5, ly: 108.56, rx: 255.7, ry: 108.56 },
  },
]

export const DEFAULT_DESIGN_ID = 'simple_3'

/** 좌우 릴 공통 이미지 */
export const REEL_IMAGE = reelImage
/** 모든 릴 위에 동일하게 겹치는 쉐도우 (회전 안 함) */
export const REEL_SHADOW = reelShadow

/** 릴 좌표 기준 좌표계 크기 */
export const CASSETTE_BASE_W = 393
export const CASSETTE_BASE_H = 232

export function getDesign(id: string | undefined): CassetteDesign {
  return CASSETTE_DESIGNS.find((d) => d.id === id) ?? CASSETTE_DESIGNS.find((d) => d.id === DEFAULT_DESIGN_ID)!
}
