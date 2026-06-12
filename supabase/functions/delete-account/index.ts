// 회원탈퇴 — 호출자(JWT)의 모든 데이터 + auth 계정 레코드까지 삭제 (service role 사용)
// 배포: Supabase 대시보드 → Edge Functions → "delete-account" 생성 후 이 코드 붙여넣기 / 또는 `supabase functions deploy delete-account`
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

    // 1) 호출자 식별 (전달된 JWT로 본인 확인)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)
    const userId = user.id

    // 2) service role로 데이터 + 계정 삭제
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: tapes } = await admin.from('tapes').select('id').eq('user_id', userId)
    const tapeIds = (tapes ?? []).map((t: { id: string }) => t.id)

    if (tapeIds.length) {
      const { data: segs } = await admin.from('segments').select('audio_path').in('tape_id', tapeIds)
      const paths = (segs ?? [])
        .map((s: { audio_path: string | null }) => s.audio_path)
        .filter((p: string | null): p is string => !!p)
      if (paths.length) await admin.storage.from('tape-audio').remove(paths)
      await admin.from('segments').delete().in('tape_id', tapeIds)
      await admin.from('tapes').delete().in('id', tapeIds)
    }

    // profiles 테이블이 생기면(닉네임 단계) 여기서 함께 삭제: await admin.from('profiles').delete().eq('user_id', userId)

    // 3) auth 계정 레코드 삭제
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) return json({ error: delErr.message }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'error' }, 500)
  }
})
