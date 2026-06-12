import { supabase } from './supabase'
import { uploadAudio, getAudioUrl } from './storage'
import type { Tape, TapeWithStats, Segment } from './types'

function mapStats(row: Tape & { segments: { duration_seconds: number | null }[] | null }): TapeWithStats {
  const { segments, ...tape } = row
  const segs = segments ?? []
  return {
    ...tape,
    caption: tape.caption ?? '',
    design: tape.design ?? 'simple_3',
    segment_count: segs.length,
    total_duration_seconds: segs.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0),
  }
}

export async function listTapes(): Promise<Tape[]> {
  const { data, error } = await supabase
    .from('tapes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 내 카세트 (직접 만든 것 — 받은 것 제외) */
export async function listTapesWithStats(): Promise<TapeWithStats[]> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return []
  const { data, error } = await supabase
    .from('tapes')
    .select('*, segments(duration_seconds)')
    .eq('user_id', userId)
    .or('is_received.is.null,is_received.eq.false')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapStats)
}

/** 받은 카세트 (상대에게 받아 보관한 것) */
export async function listReceivedTapesWithStats(): Promise<TapeWithStats[]> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return []
  const { data, error } = await supabase
    .from('tapes')
    .select('*, segments(duration_seconds)')
    .eq('user_id', userId)
    .eq('is_received', true)
    .order('received_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapStats)
}

export type SaveReceivedResult = { status: 'saved' | 'already' | 'own'; tapeId: string }

/** 받은 카세트 보관 — 원본(공유) 카세트를 내 계정으로 복사(세그먼트·오디오 포함). 보관된 카세트 id 반환. */
export async function saveReceived(sourceTapeId: string): Promise<SaveReceivedResult> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const source = await getTape(sourceTapeId)
  if (!source) throw new Error('카세트를 찾을 수 없어요')
  if (source.user_id === userId) return { status: 'own', tapeId: sourceTapeId } // 내가 만든 것

  // 중복 보관 방지
  const { data: existing } = await supabase
    .from('tapes')
    .select('id')
    .eq('user_id', userId)
    .eq('source_tape_id', sourceTapeId)
    .maybeSingle()
  if (existing) return { status: 'already', tapeId: existing.id as string }

  const sourceSegments = await listSegments(sourceTapeId)

  const { data: newTape, error } = await supabase
    .from('tapes')
    .insert({
      title: source.title,
      caption: source.caption,
      design: source.design,
      user_id: userId,
      is_received: true,
      source_tape_id: sourceTapeId,
      received_at: new Date().toISOString(),
      to_name: source.to_name ?? null,
      from_name: source.from_name ?? null,
      note: source.note ?? null,
    })
    .select()
    .single()
  if (error) throw error

  // 세그먼트 + 오디오 복제 (공개 URL → 내 새 tape 폴더로 재업로드)
  for (const seg of sourceSegments) {
    let newPath: string | null = null
    if (seg.audio_path) {
      try {
        const blob = await (await fetch(getAudioUrl(seg.audio_path))).blob()
        const ext = seg.audio_path.split('.').pop() || 'webm'
        newPath = await uploadAudio(newTape.id, blob, ext)
      } catch {
        newPath = null // 오디오 복제 실패해도 세그먼트는 보존
      }
    }
    await insertSegment({
      tape_id: newTape.id,
      position: seg.position,
      message: seg.message,
      duration_seconds: seg.duration_seconds,
      audio_path: newPath,
    })
  }
  return { status: 'saved', tapeId: newTape.id as string }
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

/**
 * 회원 탈퇴 — 현재 로그인 사용자의 모든 데이터(테이프·세그먼트·오디오 파일)를 삭제하고 로그아웃한다.
 * NOTE(auth): auth.users 레코드 자체 삭제는 service role이 필요해 Edge Function으로 별도 처리 예정.
 *             현재는 데이터 전량 삭제 + 로그아웃까지 수행한다.
 */
export async function deleteAccount(): Promise<void> {
  // 1순위: Edge Function으로 데이터 + auth 계정 레코드까지 완전 삭제 (service role)
  try {
    const { error } = await supabase.functions.invoke('delete-account')
    if (!error) {
      await supabase.auth.signOut()
      return
    }
  } catch {
    // Edge Function 미배포/실패 → 아래 클라이언트 폴백
  }
  // 폴백: 최소한 내 데이터(테이프·세그먼트·스토리지)는 삭제하고 로그아웃
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (userId) {
    const { data: tapes } = await supabase.from('tapes').select('id').eq('user_id', userId)
    for (const t of tapes ?? []) {
      try {
        await deleteTape(t.id)
      } catch {
        // 일부 실패해도 계속
      }
    }
  }
  await supabase.auth.signOut()
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
