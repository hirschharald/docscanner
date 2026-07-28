import type { Document } from '@/types'

const STORAGE_KEY = 'docscanner_documents'

export function loadDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Document[]) : []
  } catch {
    return []
  }
}

export function saveDocuments(docs: Document[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
}

export function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
