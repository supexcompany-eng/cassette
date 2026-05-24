import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createTape, deleteTape, listTapes } from '../../lib/db'
import type { Tape } from '../../lib/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export default function TapeListPage() {
  const navigate = useNavigate()
  const [tapes, setTapes] = useState<Tape[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTapes()
      .then((t) => {
        if (!cancelled) setTapes(t)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const tape = await createTape()
      navigate(`/tape/${tape.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm('이 테이프를 삭제하시겠어요?')
    if (!ok) return
    try {
      await deleteTape(id)
      setTapes((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="w-[393px] h-[852px] bg-[#171717] text-[#E1E1E1] relative overflow-hidden flex flex-col">
        <div className="bg-[#171717] flex h-[44px] items-center justify-between px-[24px] shrink-0">
          <p className="font-['Sometype_Mono',monospace] leading-[22.5px] text-[15px] text-[#E1E1E1]">9:41</p>
        </div>

        <div className="bg-[#171717] flex h-[64px] items-center px-[20px] shrink-0">
          <p className="flex-1 font-['Sometype_Mono',monospace] leading-[25.5px] text-[17px] text-[#e1e1e1]">
            tapes
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-[#e1e1e1] text-[#111] font-['MaruBuriBold',sans-serif] text-[13px] h-[34px] px-[14px] rounded-[8px] disabled:opacity-50"
          >
            {creating ? '...' : '+ 새 테이프'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[20px] pb-[20px]">
          {loading && (
            <p className="text-[#888] text-[13px] font-['Sometype_Mono',monospace] mt-[20px]">
              loading...
            </p>
          )}
          {error && (
            <p className="text-[#C4383F] text-[12px] font-['MaruBuri',sans-serif] mt-[12px]">
              {error}
            </p>
          )}
          {!loading && tapes.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-[12px] pb-[80px]">
              <p className="text-[#888] text-[14px] font-['MaruBuri',sans-serif]">
                아직 녹음한 테이프가 없어요
              </p>
              <p className="text-[#515151] text-[12px] font-['MaruBuri',sans-serif]">
                위에서 새 테이프를 만들어 보세요
              </p>
            </div>
          )}
          <div className="flex flex-col gap-[8px] mt-[8px]">
            {tapes.map((tape) => (
              <div
                key={tape.id}
                onClick={() => navigate(`/tape/${tape.id}`)}
                className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-[8px] h-[64px] px-[16px] flex items-center gap-[12px] cursor-pointer hover:border-[#3a3a3a]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-['Sometype_Mono',monospace] text-[15px] text-[#E1E1E1] truncate">
                    {tape.title}
                  </p>
                  <p className="font-['Sometype_Mono',monospace] text-[11px] text-[#888] mt-[2px]">
                    {formatDate(tape.created_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(tape.id)
                  }}
                  className="text-[#888] hover:text-[#C4383F] text-[12px] font-['Sometype_Mono',monospace] px-[8px] py-[6px]"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
