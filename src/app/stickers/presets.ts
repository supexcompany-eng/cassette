import { getStickerUrl } from '../../lib/storage'
import type { Sticker } from '../../lib/types'
import stickerTest from '../../assets/stickers/sticker_test.png'

export interface PresetSticker {
  /** Sticker.src에 저장되는 고유 키 */
  key: string
  /** 렌더링에 사용할 이미지 URL */
  url: string
  /** 팔레트 접근성 라벨 */
  label: string
}

/**
 * 앱 제공 스티커 목록.
 *
 * 스티커 PNG를 추가하려면:
 *   1) `src/assets/stickers/`에 PNG를 넣고
 *   2) 상단에서 `import xxx from '../../assets/stickers/xxx.png'`로 불러온 뒤
 *   3) 아래 배열에 `{ key: 'xxx', url: xxx, label: '설명' }`를 추가하면 끝.
 *
 * 현재는 비어 있어 팔레트에 "스티커 준비 중" 안내가 표시됩니다.
 */
export const PRESET_STICKERS: PresetSticker[] = [
  { key: 'chick', url: stickerTest, label: '병아리' },
]

const presetUrlByKey = new Map(PRESET_STICKERS.map((p) => [p.key, p.url]))

/** 스티커를 실제 렌더링 가능한 이미지 URL로 변환 */
export function resolveStickerUrl(sticker: Pick<Sticker, 'kind' | 'src'>): string {
  if (sticker.kind === 'image') return getStickerUrl(sticker.src)
  return presetUrlByKey.get(sticker.src) ?? ''
}
