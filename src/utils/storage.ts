import type { Document } from '@/types'
import { readAllFromStore, writeAllToStore } from '@/utils/indexedDb'

const STORAGE_STORE = 'documents'
const LEGACY_STORAGE_KEY = 'docscanner_documents'

export async function loadDocuments(): Promise<Document[]> {
  const documents = await readAllFromStore<Document>(STORAGE_STORE)

  if (documents.length > 0) {
    return documents
  }

  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as Document[]
    await saveDocuments(parsed)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    return parsed
  } catch {
    return []
  }
}

export async function saveDocuments(docs: Document[]): Promise<void> {
  await writeAllToStore(STORAGE_STORE, docs)
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
