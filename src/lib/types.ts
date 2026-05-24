export interface Tape {
  id: string
  title: string
  created_at: string
  updated_at: string
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
