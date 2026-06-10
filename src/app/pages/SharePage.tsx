import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { getTape, listSegments } from '../../lib/db'
import { useTapePlayback } from '../../hooks/useTapePlayback'
import ShareStage from '../components/ShareStage'
import type { Segment, Tape } from '../../lib/types'

// 랜딩: 393×650, 데크 -44(카세트 frame 54), 쪽지 470 (데크 바닥 500과 30px 겹침)
const STAGE_W = 393
const STAGE_H = 650
const DECK_TOP = -44
const MEMO_TOP = 470

function formatDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

/** 공유 링크(/s/:id) 랜딩 페이지 — 받은 사람이 보는 화면. 393×650을 뷰포트에 맞게 스케일. */
export default function SharePage() {
  const { id } = useParams<{ id: string }>()
  const [tape, setTape] = useState<Tape | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const playback = useTapePlayback(segments)

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H, 1.4))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([getTape(id), listSegments(id)])
      .then(([t, s]) => {
        if (cancelled) return
        setTape(t)
        setSegments(s)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오지 못했어요')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading || error || !tape) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#e7e3df] font-mix text-[14px] text-[#888]">
        {loading ? 'loading…' : (error ?? '카세트를 찾을 수 없어요')}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#e7e3df]">
      <div style={{ transform: `scale(${scale})` }}>
        <ShareStage
          tape={tape}
          segments={segments}
          playback={playback}
          headerText="Cassette"
          toName={tape.to_name ?? ''}
          note={tape.note ?? ''}
          fromName={tape.from_name ?? ''}
          date={formatDate(tape.shared_at)}
          width={STAGE_W}
          height={STAGE_H}
          deckTop={DECK_TOP}
          memoTop={MEMO_TOP}
        />
      </div>
    </div>
  )
}
