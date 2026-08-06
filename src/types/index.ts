export interface Document {
  id: string
  name: string
  type: 'scan' | 'upload'
  createdAt: number
  tags: string[]
  dataUrl: string
}

export type Theme = 'light' | 'dark'

export interface AppState {
  documents: Document[]
  theme: Theme
}

export interface BackendDocumentPayload extends Document {
  metadata: Record<string, string>
}

export interface UploadDocumentsResult {
  ok: boolean
  skipped?: boolean
  count?: number
  message?: string
}

export interface BackendMetadataEntry {
  id: string
  name: string
  type: string
  createdAt: number
  tags: string[]
  metadata: Record<string, string>
  year?: string
  fileName?: string
  outputPath?: string
  storedAt?: string
  bytes?: number
}