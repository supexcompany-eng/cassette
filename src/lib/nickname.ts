import { supabase } from './supabase'

/**
 * 사용자 닉네임 (보내는사람 기본값 / 설정 표시).
 * 저장 위치: Supabase 계정(auth user_metadata.nickname) — 기기 간 동기화. 중복 검사 없음.
 * localStorage는 빠른 캐시(동기 읽기용)로 함께 사용.
 */

const KEY = 'cassette.nickname'

const ADJECTIVES = [
  '느긋한', '포근한', '반짝이는', '잔잔한', '따뜻한', '상냥한', '씩씩한', '엉뚱한',
  '솔직한', '다정한', '용감한', '차분한', '즐거운', '달콤한', '신나는', '조용한',
  '부드러운', '명랑한', '나른한', '귀여운',
]
const NOUNS = [
  '고양이', '토끼', '강아지', '여우', '곰', '수달', '펭귄', '다람쥐', '너구리',
  '햄스터', '참새', '고래', '거북이', '부엉이', '사슴', '판다', '오리', '두더지',
  '고슴도치', '병아리',
]

function randomNickname(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${a} ${n}`
}

function cache(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // ignore
  }
}

/** 현재 닉네임 (캐시 기준, 동기). 캐시 비었으면 랜덤 생성해 캐시 — 계정 동기화는 ensureNickname이 담당 */
export function getNickname(): string {
  try {
    let n = localStorage.getItem(KEY)
    if (!n) {
      n = randomNickname()
      cache(n)
    }
    return n
  } catch {
    return randomNickname()
  }
}

/** 닉네임 변경 — 캐시 즉시 반영 + 계정(user_metadata)에 저장 */
export async function setNickname(name: string): Promise<void> {
  cache(name)
  try {
    await supabase.auth.updateUser({ data: { nickname: name } })
  } catch {
    // 네트워크 실패해도 캐시엔 반영됨
  }
}

/**
 * 로그인 후 호출 — 계정에 닉네임이 있으면 그걸 캐시(기기 동기화),
 * 없으면 (기존 로컬 또는 새 랜덤) 닉네임을 계정에 저장한다. 최종 닉네임 반환.
 */
export async function ensureNickname(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return getNickname()
    const meta = user.user_metadata?.nickname as string | undefined
    if (meta && meta.trim()) {
      cache(meta)
      return meta
    }
    let local: string | null = null
    try {
      local = localStorage.getItem(KEY)
    } catch {
      // ignore
    }
    const next = local && local.trim() ? local : randomNickname()
    try {
      await supabase.auth.updateUser({ data: { nickname: next } })
    } catch {
      // ignore
    }
    cache(next)
    return next
  } catch {
    return getNickname()
  }
}
