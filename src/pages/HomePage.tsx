import React, { useState, useMemo } from 'react'
import type { Document } from '@/types'
import { DocumentCard } from '@/components/DocumentCard'
import { DocumentModal } from '@/components/DocumentModal'

interface HomePageProps {
  documents: Document[]
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onCrop: (id: string, dataUrl: string) => void
}

export const HomePage = React.memo<HomePageProps>(({ documents, onDelete, onRename, onCrop }) => {
  const [query, setQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const filtered = useMemo(
    () =>
      documents.filter(
        (d) =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      ),
    [documents, query]
  )

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <h2 className="mb-0">📚 Meine Dokumente</h2>
        <span className="badge bg-secondary fs-6">{documents.length} Dokument{documents.length !== 1 ? 'e' : ''}</span>
      </div>

      <div className="input-group mb-4">
        <span className="input-group-text">🔍</span>
        <input
          type="search"
          className="form-control"
          placeholder="Nach Name oder Tag suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div className="display-1">📭</div>
          <p className="mt-3 fs-5">
            {query ? 'Keine Dokumente gefunden.' : 'Noch keine Dokumente vorhanden.'}
          </p>
          {!query && (
            <div className="d-flex gap-2 justify-content-center">
              <a href="/scan" className="btn btn-primary">📷 Scannen</a>
              <a href="/upload" className="btn btn-outline-primary">📁 Hochladen</a>
            </div>
          )}
        </div>
      ) : (
        <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="col">
              <DocumentCard
                document={doc}
                onDelete={onDelete}
                onRename={onRename}
                onView={setSelectedDoc}
              />
            </div>
          ))}
        </div>
      )}

      <DocumentModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onCropSave={(id, dataUrl) => {
          onCrop(id, dataUrl)
          setSelectedDoc((prev) => prev ? { ...prev, dataUrl } : null)
        }}
      />
    </div>
  )
})

HomePage.displayName = 'HomePage'
