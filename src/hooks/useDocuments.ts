import { useState, useCallback } from 'react'
import type { Document } from '@/types'
import { loadDocuments, saveDocuments, generateId } from '@/utils/storage'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>(loadDocuments)

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
      saveDocuments(updated)
      return updated
    })
    return doc
  }, [])

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id)
      saveDocuments(updated)
      return updated
    })
  }, [])

  const updateDocument = useCallback((id: string, patch: Partial<Pick<Document, 'name' | 'tags'>>) => {
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      saveDocuments(updated)
      return updated
    })
  }, [])

  const cropDocument = useCallback((id: string, dataUrl: string) => {
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, dataUrl } : d))
      saveDocuments(updated)
      return updated
    })
  }, [])

  return { documents, addDocument, removeDocument, updateDocument, cropDocument }
}
