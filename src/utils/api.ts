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

export interface SystemHealth {
  ok: boolean
  backend: boolean
  db: boolean
}

export interface SystemHealth {
  ok: boolean
  backend: boolean
  db: boolean
}

export async function fetchSystemHealth(baseUrl?: string): Promise<SystemHealth> {
  const endpoint = baseUrl ?? `${import.meta.env.VITE_API_URL ?? '/api'}/health`

  try {
    const response = await fetch(endpoint, { cache: 'no-store' })

    if (!response.ok) {
      return { ok: false, backend: false, db: false }
    }

    const data = await response.json().catch(() => null)

    return {
      ok: Boolean(data?.ok),
      backend: Boolean(data?.backend),
      db: Boolean(data?.db),
    }
  } catch {
    return { ok: false, backend: false, db: false }
  }
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

export async function loadDocumentsFromBackend(
  baseUrl?: string,
): Promise<BackendMetadataEntry[]> {

  try {
    const documents = await fetchMetadataFromBackend(baseUrl);
    if (documents.length > 0) {
      return documents;
    }
  } catch (error) {
    console.error("Error fetching metadata from backend:", error);
  }
  return [];
}

export async function fetchMetadataFromBackend(baseUrl?: string): Promise<BackendMetadataEntry[]> {
  const endpoint = baseUrl ?? `${import.meta.env.VITE_API_URL ?? '/api'}/metadata`
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

  const endpoint = baseUrl ?? `${import.meta.env.VITE_API_URL ?? '/api'}/documents`

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

export async function updateDocumentInBackend(
  id: string,
  patch: Partial<Pick<BackendMetadataEntry, 'name' | 'tags' | 'metadata' | 'type' | 'createdAt' | 'year' | 'fileName' | 'outputPath' | 'storedAt' | 'bytes'>>,
  baseUrl?: string,
): Promise<{ ok: boolean; metadata?: BackendMetadataEntry }> {
  const endpoint = baseUrl ?? `${import.meta.env.VITE_API_URL ?? '/api'}/documents`
  const response = await fetch(`${endpoint}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`)
  }

  return response.json().catch(() => ({ ok: true }))
}

export async function deleteDocumentInBackend(
  id: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  const endpoint = baseUrl ?? `${import.meta.env.VITE_API_URL ?? '/api'}/documents`
  const response = await fetch(`${endpoint}/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`)
  }

  return response.json().catch(() => ({ ok: true }))
}