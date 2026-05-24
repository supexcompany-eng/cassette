import { supabase } from './supabase'
import type { Tape, Segment } from './types'

export async function listTapes(): Promise<Tape[]> {
  const { data, error } = await supabase
    .from('tapes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTape(id: string): Promise<Tape | null> {
  const { data, error } = await supabase.from('tapes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
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
  return data
}

export async function updateTape(id: string, patch: Partial<Pick<Tape, 'title'>>) {
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
