/**
 * 사용자 닉네임 (보내는사람 기본값 / 설정 표시).
 * 최초엔 형용사+명사 랜덤 조합으로 생성, 이후 사용자가 수정 가능.
 *
 * NOTE(auth): 지금은 localStorage 임시 저장이라 기기별·중복 허용. 로그인 단계에서
 * profiles 테이블(user_id ↔ nickname unique)로 교체하고 사용자간 중복 검사를 붙인다.
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

/** 현재 닉네임 (없으면 랜덤 생성해 저장) */
export function getNickname(): string {
  try {
    let n = localStorage.getItem(KEY)
    if (!n) {
      n = randomNickname()
      localStorage.setItem(KEY, n)
    }
    return n
  } catch {
    return randomNickname()
  }
}

/** 닉네임 저장 */
export function setNickname(name: string): void {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // ignore
  }
}
