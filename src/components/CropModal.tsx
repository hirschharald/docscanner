import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface CropModalProps {
  imageSrc: string | null
  onConfirm: (croppedDataUrl: string) => void
  onCancel: () => void
}

function centerInitialCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, width / height, width, height),
    width,
    height
  )
}

function getCroppedCanvas(image: HTMLImageElement, crop: PixelCrop): HTMLCanvasElement {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width * scaleX)
  canvas.height = Math.round(crop.height * scaleY)

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  )
  return canvas
}

export const CropModal = React.memo<CropModalProps>(({ imageSrc, onConfirm, onCancel }) => {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerInitialCrop(width, height))
  }, [])

  const handleConfirm = useCallback(() => {
    if (!completedCrop || !imgRef.current) return
    const canvas = getCroppedCanvas(imgRef.current, completedCrop)
    onConfirm(canvas.toDataURL('image/jpeg', 0.92))
  }, [completedCrop, onConfirm])

  const handleSkip = useCallback(() => {
    if (imageSrc) onConfirm(imageSrc)
  }, [imageSrc, onConfirm])

  if (!imageSrc) return null

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">✂️ Dokument zuschneiden</h5>
            <small className="text-muted ms-2">Ziehe den Rahmen um den gewünschten Bereich</small>
          </div>

          <div className="modal-body p-2 d-flex justify-content-center bg-dark" style={{ minHeight: 300 }}>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              minWidth={20}
              minHeight={20}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Zuschneiden"
                onLoad={handleImageLoad}
                style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
              />
            </ReactCrop>
          </div>

          <div className="modal-footer justify-content-between">
            <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
              ✕ Abbrechen
            </button>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={handleSkip} title="Ohne Zuschneiden übernehmen">
                Überspringen
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleConfirm}
                disabled={!completedCrop?.width || !completedCrop?.height}
              >
                ✂️ Zuschneiden & übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

CropModal.displayName = 'CropModal'
