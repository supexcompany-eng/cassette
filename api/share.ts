export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface SegRow {
  duration_seconds: number | null
}

/**
 * /s/:id 요청에 OG 메타가 박힌 HTML 셸을 반환한다.
 * 크롤러는 JS를 실행하지 않으므로 미리보기(제목/이미지)는 여기서 서버 렌더로 넣고,
 * 실제 화면은 같은 HTML이 로드한 SPA가 /s/:id 라우트로 그린다.
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const origin = url.origin
  const id = url.searchParams.get('id') ?? ''

  let caption = '카세트'
  let metaLine = '카세트로 녹음한 순간을 들어보세요'
  if (SUPABASE_URL && SUPABASE_ANON_KEY && id) {
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    try {
      const [tapeRes, segRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/tapes?id=eq.${id}&select=caption`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/segments?tape_id=eq.${id}&select=duration_seconds`, { headers }),
      ])
      const tapes = (await tapeRes.json()) as { caption: string | null }[]
      const c = tapes?.[0]?.caption?.trim()
      if (c) caption = c
      const segs = (await segRes.json()) as SegRow[]
      if (Array.isArray(segs)) {
        const total = segs.reduce((s, x) => s + (x.duration_seconds || 0), 0)
        metaLine = `${segs.length}구간 · ${Math.floor(total / 60)}분 ${total % 60}초`
      }
    } catch {
      // 데이터 못 받으면 기본 문구 사용
    }
  }

  // 빌드된 SPA 셸 가져오기 (정적 파일이라 rewrite보다 우선 — 루프 없음)
  let html = ''
  try {
    html = await (await fetch(`${origin}/index.html`)).text()
  } catch {
    html = '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
  }

  const title = `${caption} | Cassette`
  const desc = metaLine
  const ogImage = `${origin}/api/og?id=${encodeURIComponent(id)}`
  const pageUrl = `${origin}/s/${encodeURIComponent(id)}`

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Cassette" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n    ')

  // index.html의 정적(앱 공유용) OG/타이틀 제거 후 이 카세트 전용 메타 주입
  html = html.replace(/<title>.*?<\/title>/i, '')
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/?>(?:\s*)/gi, '')
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>(?:\s*)/gi, '')
  html = html.replace(/<meta\s+name="description"[^>]*\/?>(?:\s*)/gi, '')
  html = html.replace('</head>', `    ${tags}\n  </head>`)

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
