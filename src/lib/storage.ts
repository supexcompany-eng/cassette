import { supabase } from './supabase'

const BUCKET = 'tape-audio'

export async function uploadAudio(tapeId: string, blob: Blob, ext = 'webm'): Promise<string> {
  const path = `${tapeId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || `audio/${ext}`,
    upsert: false,
  })
  if (error) throw error
  return path
}

export function getAudioUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAudio(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
