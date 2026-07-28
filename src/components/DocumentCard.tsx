import React, { useState } from 'react'
import type { Document } from '@/types'
import { formatDate } from '@/utils/storage'

interface DocumentCardProps {
  document: Document
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onView: (document: Document) => void
}

export const DocumentCard = React.memo<DocumentCardProps>(({ document, onDelete, onRename, onView }) => {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(document.name)

  const handleRename = () => {
    if (editName.trim()) {
      onRename(document.id, editName.trim())
    }
    setEditing(false)
  }

  return (
    <div className="card doc-card shadow-sm h-100">
      <img
        src={document.dataUrl}
        alt={document.name}
        className="doc-preview-img"
        onClick={() => onView(document)}
      />
      <div className="card-body d-flex flex-column gap-1 p-2">
        {editing ? (
          <div className="input-group input-group-sm">
            <input
              className="form-control"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
              autoFocus
            />
            <button className="btn btn-success btn-sm" onClick={handleRename}>✓</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setEditName(document.name) }}>✕</button>
          </div>
        ) : (
          <h6 className="card-title mb-0 text-truncate" title={document.name}>{document.name}</h6>
        )}
        <small className="text-muted">{formatDate(document.createdAt)}</small>
        <div className="d-flex flex-wrap gap-1 mb-1">
          {document.tags.map((tag) => (
            <span key={tag} className="badge bg-secondary tag-badge">{tag}</span>
          ))}
        </div>
        <div className="d-flex gap-1 mt-auto">
          <button className="btn btn-outline-primary btn-sm flex-fill" onClick={() => onView(document)}>👁 Ansehen</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEditing(true) }} title="Umbenennen">✏️</button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(document.id)} title="Löschen">🗑</button>
        </div>
      </div>
    </div>
  )
})

DocumentCard.displayName = 'DocumentCard'
