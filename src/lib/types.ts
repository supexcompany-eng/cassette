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
  /** 소유자 (RLS). createTape/saveReceived에서 설정 */
  user_id?: string | null
  /** 받은 카세트 여부 (true=상대에게 받아 보관한 복사본) */
  is_received?: boolean | null
  /** 받은 카세트의 원본 tape id (중복 보관 방지) */
  source_tape_id?: string | null
  received_at?: string | null
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
