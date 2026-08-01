import type { Document } from '@/types'

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

function parseMetadataTags(tags: string[]): Record<string, string> {
  return tags.reduce<Record<string, string>>((metadata, tag) => {
    const separatorIndex = tag.indexOf(':')

    if (separatorIndex > 0) {
      const key = tag.slice(0, separatorIndex).trim()
      const value = tag.slice(separatorIndex + 1).trim()

      if (key && value) {
        metadata[key] = value
      }
    }

    return metadata
  }, {})
}

export async function fetchMetadataFromBackend(baseUrl?: string): Promise<BackendMetadataEntry[]> {
  const endpoint = baseUrl ?? import.meta.env.VITE_API_URL ?? '/api/metadata'
  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`)
  }

  const data = await response.json().catch(() => ({ metadata: [] }))
  return Array.isArray(data?.metadata) ? data.metadata : []
}

export async function uploadDocumentsToBackend(
  documents: Document[],
  baseUrl?: string
): Promise<UploadDocumentsResult> {
  const endpoint = baseUrl ?? import.meta.env.VITE_API_URL ?? '/api/documents'

  const payload = documents.map((document) => ({
    ...document,
    metadata: parseMetadataTags(document.tags),
  }))
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documents: payload }),
  })

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`)
  }

  const data = await response.json().catch(() => ({ ok: true }))

  return {
    ok: true,
    count: payload.length,
    ...data,
  }
}
