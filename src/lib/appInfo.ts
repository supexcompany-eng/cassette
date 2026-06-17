import { SHARE_BASE_URL } from './share'

/**
 * 앱 공통 정보 — 한 곳에서만 관리(메일/약관 링크).
 * 메일 주소나 약관 URL을 바꿔야 하면 여기만 수정하면 전 화면에 반영된다.
 */

/** 문의 메일 주소 (설정 > 문의하기). 변경 시 여기만 고치면 됨 */
export const CONTACT_EMAIL = 'mgsong.biz@gmail.com'

/** 개인정보처리방침 / 이용약관 (Vercel 호스팅 정적 페이지) */
export const PRIVACY_URL = `${SHARE_BASE_URL}/privacy`
export const TERMS_URL = `${SHARE_BASE_URL}/terms`

/** 문의하기 mailto 링크 (제목 자동 채움) */
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[Cassette] 문의')}`
