import { useEffect, useState } from 'react'

interface PinPadProps {
  /** 안내 문구 (\n 줄바꿈 허용) */
  title: string
  /** 4자리 입력 완료 시 */
  onComplete: (pin: string) => void
  /** 값 바뀌면 입력 초기화 */
  resetSignal?: number
  error?: boolean
  /** 있으면 "비밀번호를 잊으셨나요?" 노출 (탭 시 호출) */
  onForgot?: () => void
}

/** 키패드 삭제 아이콘 (디자인 ic_keypaddelete) */
function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 5H8.5L3 12l5.5 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="M11.5 9.5l5 5m0-5l-5 5" />
    </svg>
  )
}

// Figma 467:18683 / 478:17580 — 393×852 디자인 좌표 그대로, 화면에 맞게 스케일.
export default function PinPad({ title, onComplete, resetSignal, error, onForgot }: PinPadProps) {
  const [digits, setDigits] = useState('')
  const [scale, setScale] = useState(1)

  useEffect(() => {
    setDigits('')
  }, [resetSignal])

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 393, window.innerHeight / 852))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const press = (n: string) => {
    if (digits.length >= 4) return
    const next = digits + n
    setDigits(next)
    if (next.length === 4) onComplete(next)
  }
  const back = () => setDigits((d) => d.slice(0, -1))

  const cellCls = 'flex h-[70px] items-center justify-center font-mix text-[24px] font-medium text-[#000] active:opacity-40'

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f5f3f1]">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: 393, height: 852, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* 안내문구 (y164) */}
        <p
          className="absolute whitespace-pre-line text-center font-mix text-[18px] leading-[30px] text-[#111]"
          style={{ top: 164, left: 0, width: 393 }}
        >
          {title}
        </p>

        {/* 점 4개 (y274, 12px, 간격24) */}
        <div className={`absolute flex justify-center gap-[24px] ${error ? 'opacity-60' : ''}`} style={{ top: 274, left: 0, width: 393 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`size-[12px] rounded-full ${i < digits.length ? 'bg-[#111]' : 'bg-[#d9d9d9]'}`} />
          ))}
        </div>

        {/* 비밀번호 잊음 (y463) — 별도 라인(밑줄) */}
        {onForgot ? (
          <div className="absolute flex justify-center" style={{ top: 463, left: 0, width: 393 }}>
            <button type="button" onClick={onForgot}>
              <span className="border-b-[0.5px] border-[#888] pb-[2px] font-mix text-[13px] leading-[19px] text-[#888]">비밀번호를 잊으셨나요?</span>
            </button>
          </div>
        ) : null}

        {/* 키패드 (y512, 3열×4행, 셀118×70) */}
        <div className="absolute grid grid-cols-3" style={{ top: 512, left: 20, width: 353 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} type="button" onClick={() => press(n)} className={cellCls}>
              {n}
            </button>
          ))}
          <div className="h-[70px]" />
          <button type="button" onClick={() => press('0')} className={cellCls}>
            0
          </button>
          <button type="button" onClick={back} className="flex h-[70px] items-center justify-center active:opacity-40" aria-label="지우기">
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
