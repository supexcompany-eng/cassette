// 앱 잠금: 4자리 비밀번호(해시). 생체인증 없음 — 비밀번호만.
const K_PINHASH = 'cassette.lock.pinHash'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 잠금 사용 여부 (= 비밀번호가 설정돼 있으면 사용) */
export function isLockEnabled(): boolean {
  return !!localStorage.getItem(K_PINHASH)
}

/** 비밀번호 설정/변경 */
export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(K_PINHASH, await sha256(pin))
}

/** 비밀번호 검증 */
export async function verifyPin(pin: string): Promise<boolean> {
  const h = localStorage.getItem(K_PINHASH)
  if (!h) return false
  return (await sha256(pin)) === h
}

/** 잠금 해제(끄기) — 비밀번호 분실/로그아웃 시 */
export function disableLock(): void {
  localStorage.removeItem(K_PINHASH)
}
