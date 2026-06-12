import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../../lib/supabase'
import { deleteAccount } from '../../lib/db'
import { isButtonSoundOn, setButtonSoundOn } from '../../lib/prefs'
import { getNickname, setNickname } from '../../lib/nickname'
import { CONTACT_MAILTO, PRIVACY_URL, TERMS_URL } from '../../lib/appInfo'
import { shareApp } from '../../lib/share'
import MobileFrame from '../components/MobileFrame'
import icArrowLeft from '../../assets/ic_arrow_left.svg'

const TRAILING_ICON_COLOR = '#b6b6b6'

/** 친구 초대(공유) 아이콘 — Figma ic_share (viewBox 14.25, stroke 1.5, ~14px) */
function ShareIcon() {
  return (
    <svg className="size-[14px]" viewBox="0 0 14.25 14.25" fill="none" aria-hidden>
      <path
        d="M11.375 7.83333V12.0833C11.375 12.4591 11.2257 12.8194 10.9601 13.0851C10.6944 13.3507 10.3341 13.5 9.95833 13.5H2.16667C1.79094 13.5 1.43061 13.3507 1.16493 13.0851C0.899255 12.8194 0.75 12.4591 0.75 12.0833V4.29167C0.75 3.91594 0.899255 3.55561 1.16493 3.28993C1.43061 3.02426 1.79094 2.875 2.16667 2.875H6.41667M13.5 5V0.75H9.25M13.5 0.75L5.70833 8.54167"
        stroke={TRAILING_ICON_COLOR}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** › 이동 아이콘 — ic_arrow_right 에셋과 동일 경로 (18px 박스 → 6×12 화살표) */
function ChevronRight() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 20L16 12L8 4" stroke={TRAILING_ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** ON/OFF 토글 (Figma: 트랙 64×28, 노브 39×24, 검정 트랙) */
function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative flex h-[28px] w-[64px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ${
        on ? 'bg-[#111]' : 'bg-[#cfcac3]'
      }`}
    >
      <span
        className={`block h-[24px] w-[39px] rounded-full bg-white transition-transform duration-200 ${
          on ? 'translate-x-[21px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(() => isButtonSoundOn())
  const [confirmLeave, setConfirmLeave] = useState(false)

  const toggleSound = (next: boolean) => {
    setSoundOn(next)
    setButtonSoundOn(next)
  }

  // 닉네임 (지금은 localStorage 임시 — 인증 단계에서 profiles + 중복검사로 교체)
  const [nickname, setNick] = useState(() => getNickname())
  const [editingNick, setEditingNick] = useState(false)
  const [nickDraft, setNickDraft] = useState('')
  const startEditNick = () => {
    setNickDraft(nickname)
    setEditingNick(true)
  }
  const saveNick = () => {
    const v = nickDraft.trim()
    if (v) {
      setNickname(v)
      setNick(v)
    }
    setEditingNick(false)
  }

  const handleInvite = () => {
    void shareApp()
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    navigate('/login', { replace: true })
  }

  const handleWithdraw = async () => {
    setConfirmLeave(false)
    try {
      await deleteAccount() // 내 데이터 전량 삭제 + 로그아웃
    } catch {
      // 실패해도 로그인 화면으로
    }
    navigate('/login', { replace: true })
  }

  return (
    <MobileFrame innerClassName="bg-[#f5f3f1] text-[#222]" outerClassName="bg-[#f5f3f1]">
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* 헤더 (Figma title: px-16 py-12) */}
      <div className="flex h-[64px] shrink-0 items-center gap-[10px] px-[16px]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-[40px] shrink-0 items-center justify-center"
          aria-label="뒤로"
        >
          <img src={icArrowLeft} alt="" className="size-[24px]" aria-hidden />
        </button>
        <p className="min-w-px flex-1 text-center font-mix text-[20px] font-medium leading-[32px] text-[#111]">
          Setting
        </p>
        <div className="size-[40px] shrink-0" aria-hidden />
      </div>

      {/* 본문: 상단 컨텐츠 + (하단 고정) 회원탈퇴/약관 — 사이 간격은 가변 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [overscroll-behavior:none]">
        {/* 닉네임 카드 */}
        <div className="mt-[20px] flex items-center px-[20px]">
          <div className="flex h-[68px] flex-1 items-center justify-between gap-[12px] rounded-[8px] bg-[#f0edea] px-[16px]">
            {editingNick ? (
              <input
                autoFocus
                value={nickDraft}
                maxLength={20}
                onChange={(e) => setNickDraft(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNick()
                }}
                className="min-w-px flex-1 bg-transparent font-mix text-[18px] text-black outline-none"
              />
            ) : (
              <p className="min-w-px flex-1 truncate font-mix text-[18px] text-black">{nickname}</p>
            )}
            <button
              type="button"
              onClick={editingNick ? saveNick : startEditNick}
              className={`shrink-0 border-b-[0.5px] font-['Orbit'] text-[13px] leading-[18px] ${
                editingNick ? 'border-[#111] text-[#111]' : 'border-[#888] text-[#888]'
              }`}
            >
              {editingNick ? '저장' : '수정하기'}
            </button>
          </div>
        </div>

        {/* 설정 섹션 */}
        <section className="mt-[40px] flex flex-col gap-[10px]">
          <div className="flex items-center px-[24px]">
            <p className="font-['Orbit'] text-[14px] text-[#888]">설정</p>
          </div>
          <div className="flex flex-col">
            {/* 플레이어 버튼음 */}
            <div className="flex h-[54px] items-center gap-[20px] py-[10px] pl-[24px] pr-[20px]">
              <p className="min-w-px flex-1 font-['Orbit'] text-[16px] text-[#111]">플레이어 버튼음</p>
              <Toggle on={soundOn} onChange={toggleSound} />
            </div>

            {/* 구분선 */}
            <div className="flex h-[30px] items-center px-[20px]">
              <div className="h-[0.5px] w-full bg-[#e3ded9]" />
            </div>

            {/* 친구 초대하기 */}
            <button
              type="button"
              onClick={handleInvite}
              className="flex h-[54px] items-center gap-[20px] py-[10px] pl-[24px] pr-[10px] text-left"
            >
              <p className="min-w-px flex-1 font-['Orbit'] text-[16px] text-[#111]">친구 초대하기</p>
              <span className="flex size-[40px] items-center justify-center">
                <ShareIcon />
              </span>
            </button>

            {/* 문의하기 */}
            <a
              href={CONTACT_MAILTO}
              className="flex h-[54px] items-center gap-[20px] py-[10px] pl-[24px] pr-[10px]"
            >
              <p className="min-w-px flex-1 font-['Orbit'] text-[16px] text-[#111]">문의하기</p>
              <span className="flex size-[40px] items-center justify-center">
                <ChevronRight />
              </span>
            </a>

            {/* 로그아웃 */}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex h-[54px] items-center gap-[20px] py-[10px] pl-[24px] pr-[10px] text-left"
            >
              <p className="min-w-px flex-1 font-['Orbit'] text-[16px] text-[#111]">로그아웃</p>
            </button>
          </div>
        </section>

        {/* 하단 고정: 회원탈퇴 + 약관/처리방침 (위 컨텐츠와 간격 가변) */}
        <div
          className="mt-auto flex flex-col items-center gap-[30px] pt-[40px]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 26px)' }}
        >
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="flex h-[35px] w-[90px] items-center justify-center rounded-[4px] bg-[#ebe6e1] pb-[6px] pt-[4px] font-['Orbit'] text-[14px] text-[#555]"
          >
            회원탈퇴
          </button>
          <div className="flex items-center gap-[12px]">
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-['Orbit'] text-[13px] leading-[22px] text-[#888]">
              이용약관
            </a>
            <span className="h-[12px] w-px bg-[#b6b6b6]" />
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="font-['Orbit'] text-[13px] leading-[22px] text-[#111]">
              개인정보 처리방침
            </a>
          </div>
        </div>
      </div>

      {/* 회원탈퇴 확인 다이얼로그 */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmLeave(false)}
          >
            <motion.div
              className="w-full max-w-[300px] overflow-hidden rounded-[20px] bg-white/[0.97] pb-[6px] pt-[14px]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-[24px] py-[10px] text-center font-['Orbit'] text-[16px] leading-[28px] text-[#111]">
                탈퇴 시 모든 데이터는 삭제되며
                <br />
                복구되지 않습니다
              </p>
              <div className="mt-[8px] flex">
                <button
                  type="button"
                  onClick={() => setConfirmLeave(false)}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#111]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleWithdraw()}
                  className="flex h-[60px] flex-1 items-center justify-center font-['Orbit'] text-[16px] text-[#f54c4c]"
                >
                  탈퇴
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  )
}
