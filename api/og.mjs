import { ImageResponse } from '@vercel/og'

// .mjs = 항상 ESM · Node 런타임(@vercel/og는 edge 미지원) · JSX 대신 요소 객체(h) 사용
const REACT_ELEMENT = Symbol.for('react.element')
function h(type, props, ...children) {
  const p = { ...(props || {}) }
  if (children.length) p.children = children.length === 1 ? children[0] : children
  return { $$typeof: REACT_ELEMENT, type, key: null, ref: null, props: p }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

// OG = img_og.png(1200×600) 배경 + 완전한 카세트(릴·셰도우 합성, 0,17 / 905×534.25) + 라벨 문구 (Figma 236:18000)
const OG_W = 1200
const OG_H = 630
const CASS_X = 0
const CASS_Y = 17
const CASS_W = 905
const CASS_H = 534.25
const CASS_SCALE = CASS_W / 393 // 카세트 좌표계(393×232) → OG 픽셀 환산

// 디자인별 라벨(문구) 위치·크기·폰트 (cassetteDesigns.ts와 동일, 393×232 기준)
const LABELS = {
  simple_1: { top: 58, size: 13, font: 'Orbit' },
  simple_2: { top: 58, size: 13, font: 'Orbit' },
  simple_3: { top: 48, size: 18, font: 'Kkubulim' },
  kitch_1: { top: 52, size: 14, font: 'Kkubulim' },
  kitch_2: { top: 60, size: 14, font: 'Kkubulim' },
}

// Satori는 woff2를 못 읽어 → woff2에서 변환한 TTF를 직접 호스팅(public/fonts)

async function fetchTape(id) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tapes?id=eq.${id}&select=caption,design`, { headers })
    const tapes = await res.json()
    return Array.isArray(tapes) ? tapes[0] ?? null : null
  } catch {
    return null
  }
}

// 필요한 글리프만 서브셋으로 받아오는 Google Fonts 로더 (Orbit, 한글 지원)
async function loadGoogleFont(family, text) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`
  const css = await (
    await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36' } })
  ).text()
  const ttf = css.match(/src:\s*url\((.+?)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/)
  const any = css.match(/src:\s*url\((.+?)\)/)
  const fontUrl = (ttf && ttf[1]) || (any && any[1])
  if (!fontUrl) throw new Error('font url not found')
  return await (await fetch(fontUrl)).arrayBuffer()
}

export default async function handler(req, res) {
  const host = req.headers.host || 'cassette-tape-app.vercel.app'
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`
  const { searchParams, origin } = new URL(req.url, base)
  const id = searchParams.get('id') || ''

  const tape = await fetchTape(id)
  const caption = (tape && tape.caption ? tape.caption : '').slice(0, 13)
  const design = (tape && tape.design) || 'simple_3'
  const label = LABELS[design] || LABELS.simple_3

  const bgUrl = `${origin}/og/bg.png`
  const cassetteUrl = `${origin}/og/${design}.png`

  // 라벨 폰트: 디자인에 맞춰 Orbit 또는 Kkubulim 로드
  const fonts = []
  if (caption) {
    try {
      if (label.font === 'Kkubulim') {
        const data = await (await fetch(`${origin}/fonts/BMKkubulim.ttf`)).arrayBuffer()
        fonts.push({ name: 'Kkubulim', data, style: 'normal', weight: 400 })
      } else {
        const data = await loadGoogleFont('Orbit', caption)
        fonts.push({ name: 'Orbit', data, style: 'normal', weight: 400 })
      }
    } catch {
      // 폰트 실패 시 기본 폰트
    }
  }

  const tree = h(
    'div',
    {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        fontFamily: label.font === 'Kkubulim' ? 'Kkubulim' : 'Orbit',
      },
    },
    h('img', { src: bgUrl, width: OG_W, height: OG_H, style: { position: 'absolute', left: 0, top: 0, width: OG_W, height: OG_H } }),
    h('img', {
      src: cassetteUrl,
      width: CASS_W,
      height: CASS_H,
      style: { position: 'absolute', left: CASS_X, top: CASS_Y, width: CASS_W, height: CASS_H },
    }),
    caption
      ? h(
          'div',
          {
            style: {
              position: 'absolute',
              left: CASS_X,
              top: CASS_Y + label.top * CASS_SCALE,
              width: CASS_W,
              display: 'flex',
              justifyContent: 'center',
              color: '#111',
              fontSize: Math.round(label.size * CASS_SCALE),
              lineHeight: 1.2, // 플레이어 leading-normal과 동일하게 (Satori 기본값)
            },
          },
          caption,
        )
      : null,
  )

  const image = new ImageResponse(tree, { width: OG_W, height: OG_H, fonts })

  const buf = Buffer.from(await image.arrayBuffer())
  res.statusCode = 200
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800')
  res.end(buf)
}
