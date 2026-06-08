/** 공유 링크 베이스 도메인 (Vercel 프로덕션 고정 도메인) */
export const SHARE_BASE_URL = 'https://cassette-tape-app.vercel.app'

/** 테이프 공유 URL */
export function tapeShareUrl(tapeId: string): string {
  return `${SHARE_BASE_URL}/s/${tapeId}`
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * OS 공유 시트를 띄운다. iOS WKWebView(https 보안 컨텍스트)·모바일 브라우저는 navigator.share로
 * 네이티브 시트를 띄우고, 미지원 환경은 클립보드 복사로 폴백한다. (Capacitor 플러그인 불필요)
 */
export async function shareTape(opts: { id: string; caption?: string }): Promise<ShareOutcome> {
  const url = tapeShareUrl(opts.id)
  const title = opts.caption?.trim() ? opts.caption.trim() : '카세트'
  const text = '카세트가 도착했습니다'

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      // 사용자가 취소하면 AbortError — 에러 아님
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 공유 실패 시 복사로 폴백
    }
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    // ignore
  }
  return 'failed'
}
