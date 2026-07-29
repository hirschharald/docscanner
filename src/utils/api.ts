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

export async function uploadDocumentsToBackend(
  documents: Document[],
  baseUrl?: string
): Promise<UploadDocumentsResult> {
  const endpoint = baseUrl ?? import.meta.env.VITE_API_URL

  if (!endpoint) {
    return { ok: true, skipped: true, message: 'No backend URL configured.' }
  }

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
