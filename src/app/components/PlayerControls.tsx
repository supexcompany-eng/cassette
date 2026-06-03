import norBg from '../../assets/btn_player_nor_bg.png'
import recBg from '../../assets/btn_player_rec_bg.png'
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
export default function PlayerControls({ activeTypes, onPress, onRelease, className }: PlayerControlsProps) {
  return (
    <div className={`flex h-[76px] w-[324px] items-center justify-center ${className ?? ''}`}>
      {/* 어두운 버튼 트레이 (음각) */}
      <div className="absolute inset-x-[4px] top-[4px] h-[68px] rounded-[10px] bg-[#222] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]" />
      <div className="relative flex gap-[2px]">
        {BUTTONS.map((b) => (
          <Keycap
            key={b.type}
            icon={b.icon}
            label={b.label}
            bg={b.type === 'rec' ? recBg : norBg}
            pressed={!!activeTypes[b.type]}
            onPress={() => onPress(b.type)}
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
  onPress: () => void
  onRelease?: () => void
}

function Keycap({ icon, label, bg, pressed, onPress, onRelease }: KeycapProps) {
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
      className="relative flex size-[60px] items-center justify-center"
    >
      <span
        className={`relative block size-[60px] transition-transform duration-75 ${
          pressed ? 'translate-y-[2px] brightness-95' : ''
        }`}
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
