export interface Sticker {
  id: string
  /** 'preset' = 앱 제공 스티커(에셋 키), 'image' = 클립보드 붙여넣기로 업로드된 이미지(스토리지 경로) */
  kind: 'preset' | 'image'
  /** kind에 따라 프리셋 키 또는 스토리지 경로 */
  src: string
  /** 카세트 박스 기준 정규화된 중심 좌표 (0~1) */
  x: number
  y: number
  /** 기본 크기(80px) 대비 배율 */
  scale: number
  /** 회전 각도(degree) */
  rotation: number
  /** 겹침 순서 */
  z: number
}

export interface Tape {
  id: string
  title: string
  /** 카세트 라벨에 노출되는 사용자 문구 (최대 15자). 생성/수정 화면에서 입력 */
  caption: string
  decoration: Sticker[]
  created_at: string
  updated_at: string
}

export interface TapeWithStats extends Tape {
  segment_count: number
  total_duration_seconds: number
}

export interface Segment {
  id: string
  tape_id: string
  position: number
  message: string
  duration_seconds: number
  audio_path: string | null
  created_at: string
}
