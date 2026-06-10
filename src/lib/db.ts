import { supabase } from './supabase'
import type { Tape, TapeWithStats, Segment } from './types'

export async function listTapes(): Promise<Tape[]> {
  const { data, error } = await supabase
    .from('tapes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listTapesWithStats(): Promise<TapeWithStats[]> {
  const { data, error } = await supabase
    .from('tapes')
    .select('*, segments(duration_seconds)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: Tape & { segments: { duration_seconds: number | null }[] | null }) => {
    const segments = row.segments ?? []
    return {
      id: row.id,
      title: row.title,
      caption: row.caption ?? '',
      design: row.design ?? 'simple_3',
      created_at: row.created_at,
      updated_at: row.updated_at,
      segment_count: segments.length,
      total_duration_seconds: segments.reduce(
        (sum, s) => sum + (s.duration_seconds ?? 0),
        0,
      ),
    }
  })
}

export async function getTape(id: string): Promise<Tape | null> {
  const { data, error } = await supabase.from('tapes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? { ...data, caption: data.caption ?? '', design: data.design ?? 'simple_3' } : null
}

export async function createTape(opts?: { caption?: string; design?: string }): Promise<Tape> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')
  // 내 테이프 개수로 기본 제목 번호 매김 (RLS로 본인 것만 카운트됨)
  const { count } = await supabase.from('tapes').select('*', { count: 'exact', head: true })
  const nextNumber = (count ?? 0) + 1
  const defaultTitle = `tape ${String(nextNumber).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('tapes')
    .insert({
      title: defaultTitle,
      caption: opts?.caption ?? '',
      design: opts?.design ?? 'simple_3',
      user_id: userId,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, caption: data.caption ?? '', design: data.design ?? 'simple_3' }
}

export async function updateTape(
  id: string,
  patch: Partial<
    Pick<Tape, 'title' | 'caption' | 'design' | 'to_name' | 'from_name' | 'note' | 'shared_at'>
  >,
) {
  const { error } = await supabase
    .from('tapes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTape(id: string) {
  // 1) 세그먼트 오디오 파일 정리 (tape-audio 버킷)
  try {
    const { data: segs } = await supabase.from('segments').select('audio_path').eq('tape_id', id)
    const audioPaths = (segs ?? []).map((s) => s.audio_path).filter((p): p is string => !!p)
    if (audioPaths.length) await supabase.storage.from('tape-audio').remove(audioPaths)
  } catch {
    // 스토리지 정리 실패는 무시 (DB 삭제는 진행)
  }
  // 2) 세그먼트 row 삭제 후 테이프 row 삭제 (FK cascade 없어도 고아 안 남게)
  await supabase.from('segments').delete().eq('tape_id', id)
  const { error } = await supabase.from('tapes').delete().eq('id', id)
  if (error) throw error
}

export async function listSegments(tapeId: string): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('tape_id', tapeId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function insertSegment(
  segment: Omit<Segment, 'id' | 'created_at'>
): Promise<Segment> {
  const { data, error } = await supabase.from('segments').insert(segment).select().single()
  if (error) throw error
  return data
}

export async function updateSegment(
  id: string,
  patch: Partial<Pick<Segment, 'message' | 'position' | 'duration_seconds' | 'audio_path'>>
) {
  const { error } = await supabase.from('segments').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteSegment(id: string) {
  const { error } = await supabase.from('segments').delete().eq('id', id)
  if (error) throw error
}

export async function reorderSegments(updates: { id: string; position: number }[]) {
  await Promise.all(updates.map((u) => updateSegment(u.id, { position: u.position })))
}
