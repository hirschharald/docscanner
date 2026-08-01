import { useState, useCallback, useEffect } from 'react'
import type { Document } from '@/types'
import { fetchMetadataFromBackend, uploadDocumentsToBackend } from '@/utils/api'
import { loadDocuments, saveDocuments, generateId } from '@/utils/storage'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    let active = true

    void loadDocuments().then(async (loaded) => {
      if (!active) return

      try {
        const backendMetadata = await fetchMetadataFromBackend()
        const merged = loaded.map((document) => {
          const metadataEntry = backendMetadata.find((entry) => entry.id === document.id)

          if (!metadataEntry) {
            return document
          }

          const mergedTags = Array.from(new Set([...(document.tags || []), ...(metadataEntry.tags || [])]))
          const mergedMetadata = {
            ...(document.tags ? {} : {}),
            ...(metadataEntry.metadata || {}),
          }

          return {
            ...document,
            tags: mergedTags,
            name: document.name || metadataEntry.name || 'Dokument',
            createdAt: document.createdAt || metadataEntry.createdAt || Date.now(),
            metadata: mergedMetadata,
          } as Document & { metadata?: Record<string, string> }
        })

        if (active) {
          setDocuments(merged as Document[])
          void saveDocuments(merged as Document[])
        }
      } catch {
        if (active) {
          setDocuments(loaded)
        }
      }
    })

    return () => {
      active = false
    }
  }, [])

  const addDocument = useCallback((
    name: string,
    dataUrl: string,
    type: Document['type'],
    tags: string[] = []
  ) => {
    const doc: Document = {
      id: generateId(),
      name,
      dataUrl,
      type,
      createdAt: Date.now(),
      tags,
    }

    setDocuments((prev) => {
      const updated = [doc, ...prev]
      void saveDocuments(updated)
      void uploadDocumentsToBackend([doc]).catch(() => undefined)
      return updated
    })

    return doc
  }, [])

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id)
      void saveDocuments(updated)
      return updated
    })
  }, [])

  const updateDocument = useCallback((id: string, patch: Partial<Pick<Document, 'name' | 'tags'>>) => {
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      void saveDocuments(updated)
      return updated
    })
  }, [])

  const cropDocument = useCallback((id: string, dataUrl: string) => {
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, dataUrl } : d))
      void saveDocuments(updated)
      return updated
    })
  }, [])

  return { documents, addDocument, removeDocument, updateDocument, cropDocument }
}
