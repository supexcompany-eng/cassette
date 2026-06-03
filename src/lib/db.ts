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
      decoration: row.decoration ?? [],
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
  return data ? { ...data, decoration: data.decoration ?? [] } : null
}

export async function createTape(title?: string): Promise<Tape> {
  const { count } = await supabase.from('tapes').select('*', { count: 'exact', head: true })
  const nextNumber = (count ?? 0) + 1
  const defaultTitle = `tape ${String(nextNumber).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('tapes')
    .insert({ title: title ?? defaultTitle })
    .select()
    .single()
  if (error) throw error
  return { ...data, decoration: data.decoration ?? [] }
}

export async function updateTape(
  id: string,
  patch: Partial<Pick<Tape, 'title' | 'decoration'>>,
) {
  const { error } = await supabase
    .from('tapes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTape(id: string) {
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
