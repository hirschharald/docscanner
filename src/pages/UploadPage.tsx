import React, { useState, useCallback, useRef } from 'react'
import type { Document } from '@/types'
import { CropModal } from '@/components/CropModal'

interface PreviewItem {
  file: File
  dataUrl: string
}

interface UploadPageProps {
  onAdd: (name: string, dataUrl: string, type: Document['type'], tags?: string[]) => void
}

export const UploadPage = React.memo<UploadPageProps>(({ onAdd }) => {
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [tags, setTags] = useState('')
  const [dragging, setDragging] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cropIndex, setCropIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          setPreviews((prev) => [...prev, { file, dataUrl }])
        }
        reader.readAsDataURL(file)
      })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleSaveAll = () => {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    previews.forEach(({ file, dataUrl }) => {
      onAdd(file.name.replace(/\.[^.]+$/, ''), dataUrl, 'upload', tagList)
    })
    setPreviews([])
    setTags('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const removePreview = (index: number) =>
    setPreviews((prev) => prev.filter((_, i) => i !== index))

  const handleCropConfirm = useCallback((croppedUrl: string) => {
    if (cropIndex === null) return
    setPreviews((prev) =>
      prev.map((p, i) => (i === cropIndex ? { ...p, dataUrl: croppedUrl } : p))
    )
    setCropIndex(null)
  }, [cropIndex])

  const cropSrc = cropIndex !== null ? previews[cropIndex]?.dataUrl ?? null : null

  return (
    <div className="container py-4" style={{ maxWidth: 700 }}>
      <h2 className="mb-4">📁 Dokument hochladen</h2>

      {saved && <div className="alert alert-success">✅ Alle Dokumente gespeichert!</div>}

      <div className="alert alert-info mb-4">
        <strong>Fallback:</strong> Wenn die Kamera auf Android nicht verfügbar ist, kannst du Bilder hier direkt auswählen und speichern.
      </div>

      <div
        className={`rounded p-5 text-center mb-4 ${dragging ? 'bg-primary bg-opacity-10 border border-primary' : 'border border-secondary'}`}
        style={{ borderStyle: 'dashed', cursor: 'pointer' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="display-4 mb-2">📂</div>
        <p className="mb-1 fw-semibold">Bilder hierher ziehen oder klicken</p>
        <small className="text-muted">JPG, PNG, WebP, GIF – mehrere Dateien möglich</small>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="d-none"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <>
          <div className="row row-cols-2 row-cols-sm-3 g-3 mb-3">
            {previews.map(({ file, dataUrl }, i) => (
              <div key={i} className="col">
                <div className="position-relative">
                  <img
                    src={dataUrl}
                    alt={file.name}
                    className="img-fluid rounded shadow-sm"
                    style={{ height: 130, width: '100%', objectFit: 'cover' }}
                  />
                  <div className="position-absolute top-0 end-0 m-1 d-flex flex-column gap-1">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setCropIndex(i)}
                      title="Zuschneiden"
                      style={{ borderRadius: '50%', width: 28, height: 28, padding: 0, fontSize: '0.8rem' }}
                    >✂️</button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removePreview(i)}
                      aria-label="Entfernen"
                      style={{ borderRadius: '50%', width: 28, height: 28, padding: 0 }}
                    >✕</button>
                  </div>
                </div>
                <small className="d-block text-truncate mt-1 text-muted">{file.name}</small>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Tags für alle (kommagetrennt)</label>
            <input
              type="text"
              className="form-control"
              placeholder="z.B. Rechnung, 2025"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <button className="btn btn-success w-100" onClick={handleSaveAll}>
            💾 {previews.length} Dokument{previews.length > 1 ? 'e' : ''} speichern
          </button>
        </>
      )}

      <CropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropIndex(null)}
      />
    </div>
  )
})

UploadPage.displayName = 'UploadPage'
