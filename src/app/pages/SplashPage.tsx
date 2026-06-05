import { useEffect } from 'react'
import { motion } from 'motion/react'
import imgSplash from '../../assets/img_splash.png'

/** 스플래시 노출 시간 (ms) — 이후 자동으로 목록 화면으로 전환 */
const SPLASH_DURATION = 1800

interface SplashPageProps {
  /** 스플래시 종료 시 호출 (앱 최상위에서 오버레이 제거) */
  onDone: () => void
}

/**
 * 앱 콜드 스타트 시 노출되는 스플래시.
 * img_splash 는 화면 비율(393×852)과 동일한 풀블리드 이미지(텍스트 포함)라 그대로 꽉 채운다.
 */
export default function SplashPage({ onDone }: SplashPageProps) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_DURATION)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[1000] bg-[#c0bdba]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <img
        src={imgSplash}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 size-full select-none object-cover"
      />
    </motion.div>
  )
}
