export interface Tape {
  id: string
  title: string
  /** 카세트 라벨에 노출되는 사용자 문구 (최대 13자). 생성/수정 화면에서 입력 */
  caption: string
  /** 선택한 카세트 디자인 id (cassetteDesigns: simple_1/2/3, kitch_1/2) */
  design: string
  created_at: string
  updated_at: string
  /** 공유 쪽지 — 보내기 시점에 저장. 미전송 테이프는 null */
  to_name?: string | null
  from_name?: string | null
  note?: string | null
  shared_at?: string | null
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
