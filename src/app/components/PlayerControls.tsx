import norBg from '../../assets/btn_player_nor_bg.png'
import recBg from '../../assets/btn_player_rec_bg.png'
import shareBg from '../../assets/btn_player_share.png'
import clickSound from '../../assets/sound/sound_click.mp3'

// 버튼 클릭 효과음 — WebAudio로 미리 디코딩해두고 누를 때마다 새 소스로 즉시 재생.
// (HTMLAudio 단일 인스턴스는 연타 시 직전 재생을 못 끊어 무음이 생김 → 버퍼 소스로 해결)
let clickCtx: AudioContext | null = null
let clickBuffer: AudioBuffer | null = null
let clickGain: GainNode | null = null
const CLICK_VOLUME = 0.6 // 효과음 볼륨 (원래 대비 -40%)
function ensureClickAudio() {
  if (clickCtx) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    clickCtx = new Ctx()
    clickGain = clickCtx.createGain()
    clickGain.gain.value = CLICK_VOLUME
    clickGain.connect(clickCtx.destination)
    void fetch(clickSound)
      .then((r) => r.arrayBuffer())
      .then((b) => clickCtx!.decodeAudioData(b))
      .then((buf) => {
        clickBuffer = buf
      })
      .catch(() => {})
  } catch {
    // WebAudio 불가 환경 — 효과음 생략
  }
}
// 앱 시작 시 미리 디코딩(컨텍스트는 suspended로 생성) → 첫 탭부터 소리남
if (typeof window !== 'undefined') ensureClickAudio()

function playClick() {
  ensureClickAudio()
  if (!clickCtx) return
  void clickCtx.resume() // iOS: 첫 탭(제스처) 때 재개
  if (!clickBuffer) return
  try {
    const src = clickCtx.createBufferSource()
    src.buffer = clickBuffer
    src.connect(clickGain ?? clickCtx.destination)
    src.start(0)
  } catch {
    // ignore
  }
}
import icRew from '../../assets/ic_player_rew.svg'
import icStop from '../../assets/ic_player_stop.svg'
import icPlay from '../../assets/ic_player_play.svg'
import icRec from '../../assets/ic_player_rec.svg'
import icFf from '../../assets/ic_player_ff.svg'

export type ControlType = 'rew' | 'stop' | 'play' | 'rec' | 'ff'

interface PlayerControlsProps {
  /** 눌린(활성) 상태로 표시할 버튼들 */
  activeTypes: Partial<Record<ControlType, boolean>>
  onPress: (type: ControlType) => void
  onRelease?: () => void
  /** 숨길 버튼들 (예: 공유 읽기전용에서 REC 숨김) */
  hiddenTypes?: ControlType[]
  /** 'share' = REC 제거 + btn_player_share 키캡(75×60). 공유 미리보기·랜딩용 */
  variant?: 'default' | 'share'
  /** 재생 중 여부 — 재생 중 PLAY를 다시 누르면 클릭 효과음 생략(눌림은 유지) */
  playing?: boolean
  className?: string
}

const BUTTONS: { type: ControlType; icon: string; label: string }[] = [
  { type: 'rew', icon: icRew, label: 'REW' },
  { type: 'stop', icon: icStop, label: 'STOP' },
  { type: 'play', icon: icPlay, label: 'PLAY' },
  { type: 'rec', icon: icRec, label: 'REC' },
  { type: 'ff', icon: icFf, label: 'FF' },
]

/**
 * 카세트 플레이어 컨트롤 키캡 5개 (REW/STOP/PLAY/REC/FF).
 * 키캡 배경은 에셋 이미지(btn_player_nor_bg / btn_player_rec_bg), 아이콘은 ic_player_*.
 * 키 60px · 간격 2px · 어두운 음각 트레이 (Figma node 121:20050 기준).
 */
export default function PlayerControls({
  activeTypes,
  onPress,
  onRelease,
  hiddenTypes,
  variant = 'default',
  playing = false,
  className,
}: PlayerControlsProps) {
  const share = variant === 'share'
  const keyW = share ? 75 : 60 // share 키캡은 btn_player_share(150×120) 비율 유지
  const hidden = share ? ['rec' as ControlType] : (hiddenTypes ?? [])
  const buttons = hidden.length ? BUTTONS.filter((b) => !hidden.includes(b.type)) : BUTTONS
  const stripW = buttons.length * keyW + (buttons.length - 1) * 2
  const containerW = share ? stripW + 8 : 324
  return (
    <div className={`flex h-[76px] items-center justify-center ${className ?? ''}`} style={{ width: containerW }}>
      {/* 검은 트레이는 바디 이미지(img_player_body_*)에 포함 — 자체 트레이 미사용 */}
      <div className="relative flex gap-[2px]">
        {buttons.map((b) => (
          <Keycap
            key={b.type}
            icon={b.icon}
            label={b.label}
            bg={b.type === 'rec' ? recBg : share ? shareBg : norBg}
            width={keyW}
            pressed={!!activeTypes[b.type]}
            onPress={() => {
              // 재생 중 PLAY를 다시 누르면 효과음 생략 (그 외엔 항상 재생)
              if (!(b.type === 'play' && playing)) playClick()
              onPress(b.type)
            }}
            onRelease={onRelease}
          />
        ))}
      </div>
    </div>
  )
}

interface KeycapProps {
  icon: string
  label: string
  bg: string
  pressed: boolean
  width?: number
  onPress: () => void
  onRelease?: () => void
}

function Keycap({ icon, label, bg, pressed, width = 60, onPress, onRelease }: KeycapProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      className="relative flex h-[60px] items-center justify-center"
      style={{ width }}
    >
      <span
        className={`relative block h-[60px] transition-transform duration-75 ${
          pressed ? 'translate-y-[2px] brightness-95' : ''
        }`}
        style={{ width }}
      >
        <img src={bg} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full select-none" />
        {/* 아이콘: x center / y 18px (Figma) */}
        <img
          src={icon}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute left-1/2 top-[18px] size-[14px] -translate-x-1/2 select-none"
        />
      </span>
    </button>
  )
}
