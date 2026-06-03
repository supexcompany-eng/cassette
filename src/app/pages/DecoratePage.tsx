import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getTape, updateTape } from '../../lib/db'
import {
  deleteSticker as deleteStickerFile,
  uploadSticker,
} from '../../lib/storage'
import type { Sticker } from '../../lib/types'
import IconBack from '../../imports/IconBack-1/IconBack'
import MobileFrame from '../components/MobileFrame'
import CassetteFace from '../components/CassetteFace'
import { PRESET_STICKERS } from '../stickers/presets'

export default function DecoratePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [stickers, setStickers] = useState<Sticker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const loadedRef = useRef(false)
  // 로드 시점의 스냅샷 (변동사항 판정용)
  const initialJsonRef = useRef('[]')
  // 이번 세션에서 업로드한 이미지 스티커 경로 (폐기 시 정리)
  const sessionUploadsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    getTape(id)
      .then((t) => {
        if (cancelled) return
        if (!t) {
          setError('테이프를 찾을 수 없어요')
        } else {
          const deco = t.decoration ?? []
          setStickers(deco)
          initialJsonRef.current = JSON.stringify(deco)
          loadedRef.current = true
        }
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
  }, [id])

  const bringToFront = (list: Sticker[], stickerId: string): Sticker[] => {
    const maxZ = list.reduce((m, s) => Math.max(m, s.z), 0)
    return list.map((s) => (s.id === stickerId ? { ...s, z: maxZ + 1 } : s))
  }

  const handleSelect = (stickerId: string) => {
    if (!stickerId) {
      setSelectedId(null)
      return
    }
    setSelectedId(stickerId)
    setStickers((prev) => bringToFront(prev, stickerId))
  }

  const handleUpdate = (stickerId: string, patch: Partial<Sticker>) => {
    setStickers((prev) => prev.map((s) => (s.id === stickerId ? { ...s, ...patch } : s)))
  }

  const handleDelete = (stickerId: string) => {
    // 화면에서만 제거하고, 스토리지 파일 정리는 완료/폐기 시점에 일괄 처리한다.
    setStickers((prev) => prev.filter((s) => s.id !== stickerId))
    setSelectedId((prev) => (prev === stickerId ? null : prev))
  }

  const addPresetSticker = (key: string) => {
    setStickers((prev) => {
      const maxZ = prev.reduce((m, s) => Math.max(m, s.z), 0)
      const sticker: Sticker = {
        id: crypto.randomUUID(),
        kind: 'preset',
        src: key,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        z: maxZ + 1,
      }
      setSelectedId(sticker.id)
      return [...prev, sticker]
    })
  }

  const addImageSticker = useCallback(
    async (blob: Blob) => {
      if (!id) return
      const type = blob.type
      const ext = type.includes('png')
        ? 'png'
        : type.includes('jpeg') || type.includes('jpg')
          ? 'jpg'
          : type.includes('gif')
            ? 'gif'
            : type.includes('webp')
              ? 'webp'
              : 'png'
      try {
        const path = await uploadSticker(id, blob, ext)
        sessionUploadsRef.current.add(path)
        setStickers((prev) => {
          const maxZ = prev.reduce((m, s) => Math.max(m, s.z), 0)
          const sticker: Sticker = {
            id: crypto.randomUUID(),
            kind: 'image',
            src: path,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            z: maxZ + 1,
          }
          setSelectedId(sticker.id)
          return [...prev, sticker]
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : '스티커 업로드 실패')
      }
    },
    [id],
  )

  const pasteFromClipboard = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      setError('이 브라우저는 붙여넣기 버튼을 지원하지 않아요. Ctrl/Cmd+V로 붙여넣어 보세요')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (type) {
          const blob = await item.getType(type)
          await addImageSticker(blob)
          return
        }
      }
      setError('클립보드에 이미지가 없어요')
    } catch {
      setError('클립보드 접근이 안돼요. Ctrl/Cmd+V로 붙여넣어 보세요')
    }
  }

  // Ctrl/Cmd+V 붙여넣기
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const blob = it.getAsFile()
          if (blob) {
            e.preventDefault()
            void addImageSticker(blob)
          }
          return
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [addImageSticker])

  const isDirty = () => JSON.stringify(stickers) !== initialJsonRef.current

  const removeFiles = async (paths: string[]) => {
    await Promise.all(paths.map((p) => deleteStickerFile(p).catch(() => undefined)))
  }

  // 완료: DB 저장 + 더 이상 참조되지 않는 파일(삭제한 원본/안 쓰는 업로드) 정리
  const handleSave = async () => {
    if (!id || !loadedRef.current) {
      navigate(`/tape/${id}`)
      return
    }
    const finalImagePaths = new Set(
      stickers.filter((s) => s.kind === 'image').map((s) => s.src),
    )
    const originalImagePaths: string[] = (JSON.parse(initialJsonRef.current) as Sticker[])
      .filter((s) => s.kind === 'image')
      .map((s) => s.src)
    const orphaned = [...originalImagePaths, ...sessionUploadsRef.current].filter(
      (p) => !finalImagePaths.has(p),
    )
    await updateTape(id, { decoration: stickers }).catch(() => undefined)
    await removeFiles(orphaned)
    navigate(`/tape/${id}`)
  }

  // 뒤로: 변동 없으면 바로 복귀, 있으면 확인 모달 → 저장 없이 폐기
  const handleBack = async () => {
    if (isDirty()) {
      const ok = window.confirm('화면을 나가면 변경사항은 저장되지 않습니다. 나가시겠습니까?')
      if (!ok) return
    }
    // 폐기: 이번 세션에 업로드한 파일(저장되지 않음)만 정리. 원본/DB는 그대로 둔다.
    await removeFiles([...sessionUploadsRef.current])
    navigate(`/tape/${id}`)
  }

  return (
    <MobileFrame>
      <div className="shrink-0" style={{ height: 'max(env(safe-area-inset-top), 12px)' }} />

      <div className="flex items-center h-[64px] px-[12px] shrink-0 bg-[#171717] z-10">
        <button
          onClick={handleBack}
          className="size-[40px] shrink-0 flex items-center justify-center"
          aria-label="뒤로"
        >
          <IconBack />
        </button>
        <p className="flex-1 font-['Sometype_Mono',monospace] leading-[27px] text-[18px] text-[#e1e1e1] text-center">
          꾸미기
        </p>
        <button
          onClick={handleSave}
          className="shrink-0 h-[40px] px-[12px] flex items-center justify-center font-['MaruBuriBold',sans-serif] text-[14px] text-[#e1e1e1]"
        >
          완료
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-[24px] px-[20px]">
        {loading ? (
          <p className="text-[#888] text-[14px] font-['Sometype_Mono',monospace]">loading...</p>
        ) : (
          <>
            <CassetteFace
              stickers={stickers}
              spinning={false}
              editable
              selectedId={selectedId}
              onSelect={handleSelect}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />

            <div className="w-full max-w-[353px]">
              <div className="flex items-center gap-[10px] overflow-x-auto rounded-[8px] bg-[#1c1c1c] p-[12px]">
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="flex h-[44px] shrink-0 items-center gap-[6px] rounded-[8px] bg-[#2a2a2a] px-[14px] font-['MaruBuri',sans-serif] text-[13px] text-[#e1e1e1]"
                >
                  <span aria-hidden>📋</span> 이미지 붙여넣기
                </button>
                {PRESET_STICKERS.length === 0 ? (
                  <span className="whitespace-nowrap font-['MaruBuri',sans-serif] text-[12px] text-[#515151]">
                    스티커는 곧 추가될 예정이에요
                  </span>
                ) : (
                  PRESET_STICKERS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => addPresetSticker(preset.key)}
                      className="flex size-[44px] shrink-0 items-center justify-center rounded-[8px] bg-[#2a2a2a]"
                    >
                      <img src={preset.url} alt={preset.label} className="max-h-[32px] max-w-[32px]" />
                    </button>
                  ))
                )}
              </div>
              <p className="mt-[10px] text-center font-['MaruBuri',sans-serif] text-[12px] text-[#515151]">
                스티커를 드래그해 옮기고, 모서리로 크기·회전, ×로 삭제할 수 있어요
              </p>
              {error && (
                <p className="mt-[8px] text-center text-[#C4383F] text-[12px] font-['MaruBuri',sans-serif]">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </MobileFrame>
  )
}
