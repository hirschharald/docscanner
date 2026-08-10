import express from 'express'
import cors from 'cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'
import { createMetadataStore } from './postgressStore.js'

const app = express()
const port = process.env.PORT ?? 3001
const documentsBaseDir = path.resolve(process.cwd(), process.env.DOCS_BASE_PATH || 'docs')
const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || 'postgresql://docscanner:docscanner@localhost:5433/docscanner'
const metadataDbPath = process.env.METADATA_DB_PATH || connectionString
let metadataStore
let shuttingDown = false

await fs.mkdir(documentsBaseDir, { recursive: true })
metadataStore = createMetadataStore({ connectionString, documentsBaseDir })

function sanitizeName(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function inferExtensionFromDataUrl(dataUrl) {
  const mimeMatch = /^data:([^;,]+)[;,]/.exec(dataUrl || '')
  const mime = mimeMatch?.[1]?.toLowerCase()

  if (mime === 'image/png') {
    return 'png'
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return 'jpg'
  }
  if (mime === 'image/webp') {
    return 'webp'
  }
  if (mime === 'application/pdf') {
    return 'pdf'
  }

  return 'bin'
}

function extractYear(document) {
  const metadataYear = document?.metadata?.Jahr || document?.metadata?.jahr || document?.metadata?.year
  const parsedMetadataYear = Number.parseInt(String(metadataYear || ''), 10)

  if (Number.isInteger(parsedMetadataYear) && parsedMetadataYear >= 1900 && parsedMetadataYear <= 2100) {
    return String(parsedMetadataYear)
  }

  const createdAtDate = new Date(document?.createdAt || Date.now())

  if (!Number.isNaN(createdAtDate.getTime())) {
    return String(createdAtDate.getUTCFullYear())
  }

  return String(new Date().getUTCFullYear())
}

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return null
  }

  const base64Match = /^data:[^;,]+;base64,(.+)$/s.exec(dataUrl)
  if (base64Match?.[1]) {
    return Buffer.from(base64Match[1], 'base64')
  }

  const plainDataMatch = /^data:[^;,]*,(.*)$/s.exec(dataUrl)
  if (plainDataMatch?.[1]) {
    return Buffer.from(decodeURIComponent(plainDataMatch[1]), 'utf8')
  }

  return null
}

function parseMetadataTags(tags = []) {
  return tags.reduce((metadata, tag) => {
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

async function initializeMetadataDb() {
  await metadataStore.initialize()
}

function loadMetadataDb() {
  return metadataStore.load()
}
//  save a single metadata entry to the database
async function saveMetadataEntry(record) {
  return metadataStore.saveEntry(record)
}
//  persist the document metadata to the database
async function persistDocumentMetadata(document, fileInfo) {
  const metadataEntries = Array.isArray(document?.tags) ? parseMetadataTags(document.tags) : {}
  const combinedMetadata = {
    ...(document?.metadata || {}),
    ...metadataEntries,
  }

  const record = {
    id: document?.id || `doc_${Date.now()}`,
    name: document?.name || fileInfo?.fileName || 'document',
    type: document?.type || 'upload',
    createdAt: document?.createdAt || Date.now(),
    tags: Array.isArray(document?.tags) ? document.tags : [],
    metadata: combinedMetadata,
    year: fileInfo?.year,
    fileName: fileInfo?.fileName,
    outputPath: fileInfo?.outputPath,
    storedAt: new Date().toISOString(),
    bytes: fileInfo?.bytes,
  }

  await saveMetadataEntry(record)
  return record
}
//  store the document to the filesystem and return file information
async function storeDocument(document, index) {
  const year = extractYear(document)
  const outputDir = path.join(documentsBaseDir, year)
  await fs.mkdir(outputDir, { recursive: true })

  const extension = inferExtensionFromDataUrl(document?.dataUrl)
  const nameBase = sanitizeName(path.parse(document?.name || '').name) || `document_${Date.now()}_${index + 1}`
  const fileName = `${nameBase}.${extension}`
  const outputPath = path.join(outputDir, fileName)
  const data = dataUrlToBuffer(document?.dataUrl)

  if (!data) {
    throw new Error('Invalid or missing dataUrl')
  }

  await fs.writeFile(outputPath, data)

  return {
    year,
    fileName,
    outputPath,
    bytes: data.length,
  }
}

function getMetadataEntryById(id) {
  return metadataStore?.getEntryById(id) ?? null
}

async function updateMetadataEntry(id, patch = {}) {
  return metadataStore?.updateEntry(id, patch) ?? null
}

async function deleteMetadataEntry(id) {
  return metadataStore?.deleteEntry(id) ?? false
}

function resolveDocumentFilePath(entry) {
  const baseDir = path.resolve(documentsBaseDir)
  const candidates = []

  if (entry?.outputPath) {
    candidates.push(path.resolve(entry.outputPath))
  }

  else if (entry?.fileName) {
    const year = entry?.year || extractYear(entry)
    candidates.push(path.resolve(baseDir, year, entry.fileName))
  }

  return candidates.find((candidate) => candidate === baseDir || candidate.startsWith(baseDir + path.sep)) || null
}

async function closeMetadataDb() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  if (metadataStore) {
    await metadataStore.close()
  }
}

process.once('SIGINT', () => {
  void closeMetadataDb().finally(() => process.exit(0))
})

process.once('SIGTERM', () => {
  void closeMetadataDb().finally(() => process.exit(0))
})

process.once('beforeExit', () => {
  void closeMetadataDb()
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))

await initializeMetadataDb()

app.patch('/api/documents/:id', async (req, res) => {
  const patch = req.body?.patch ?? req.body
  const updatedEntry = await updateMetadataEntry(req.params.id, patch)

  // wenn sich das jahr oder der dateiname geändert hat, verschiebe die datei
  if (updatedEntry) {
    const oldEntry = await getMetadataEntryById(req.params.id)
    const oldFilePath = resolveDocumentFilePath(oldEntry)
    const newFilePath = resolveDocumentFilePath(updatedEntry)

    if (oldFilePath && newFilePath && oldFilePath !== newFilePath) {
      try {
        await fs.mkdir(path.dirname(newFilePath), { recursive: true })
        await fs.rename(oldFilePath, newFilePath)
      } catch (error) {
        console.error('Error moving file:', error)
        return res.status(500).json({ ok: false, message: 'Could not move document file' })
      }
    }
  } 

  if (!updatedEntry) {
    return res.status(404).json({ ok: false, message: 'Document not found' })
  }

  res.json({ ok: true, metadata: updatedEntry })
})

app.post('/api/documents', async (req, res) => {
  const { documents = [] } = req.body || {}

  console.log('Received documents:', documents.length)
  documents.forEach((document, index) => {
    const tags = Array.isArray(document?.tags) ? document.tags.join(', ') : '-'
    console.log(`[${index + 1}] ${document?.name || 'unnamed'} | tags: ${tags} | metadata:`, document?.metadata || {})
  })

  const saved = []
  const failed = []

  for (const [index, document] of documents.entries()) {
    try {
      const fileInfo = await storeDocument(document, index)
      const metadataEntry = await persistDocumentMetadata(document, fileInfo)
      saved.push({
        id: document?.id,
        name: document?.name,
        ...fileInfo,
        metadataEntry,
      })
    } catch (error) {
      failed.push({
        id: document?.id,
        name: document?.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (failed.length > 0) {
    console.error('Some documents could not be stored:', failed)
  }

  res.json({
    ok: failed.length === 0,
    received: documents.length,
    saved: saved.length,
    failed: failed.length,
    savedDocuments: saved,
    failedDocuments: failed,
    basePath: documentsBaseDir,
    metadataDbPath,
    message: failed.length === 0 ? 'Documents received and stored successfully' : 'Documents received with partial storage failures',
  })
})

app.get('/api/metadata', async (_req, res) => {
  const metadata = await loadMetadataDb()
  res.json({ ok: true, count: metadata.length, metadata })
})

app.get('/api/metadata/:id', (req, res) => {
  const metadata = loadMetadataDb()
  const entry = metadata.find((item) => item.id === req.params.id)

  if (!entry) {
    return res.status(404).json({ ok: false, message: 'Metadata entry not found' })
  }

  res.json({ ok: true, metadata: entry })
})



app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'docscanner-api' })
})

app.get('/api/documents/:id', async (req, res) => {
  const entry = await getMetadataEntryById(req.params.id)

  if (!entry) {
    return res.status(404).json({ ok: false, message: 'Document not found' })
  }

  const filePath = resolveDocumentFilePath(entry)

  if (!filePath) {
    return res.status(404).json({ ok: false, message: 'Document file not found' })
  }

  try {
    await fs.access(filePath)
    return res.sendFile(filePath)
  } catch {
    return res.status(404).json({ ok: false, message: 'Document file not found' })
  }
})

app.delete('/api/documents/:id', async (req, res) => {
  const entry = await getMetadataEntryById(req.params.id)

  if (!entry) {
    return res.status(404).json({ ok: false, message: 'Document not found' })
  }

  const filePath = resolveDocumentFilePath(entry)

  if (filePath) {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null
      if (errorCode !== 'ENOENT') {
        return res.status(500).json({ ok: false, message: 'Could not delete document file' })
      }
    }
  }

  const deleted = await deleteMetadataEntry(req.params.id)

  if (!deleted) {
    return res.status(404).json({ ok: false, message: 'Document not found' })
  }

  return res.json({ ok: true, id: req.params.id })
})

app.listen(port, () => {
  console.log(`Docscanner API listening on http://localhost:${port}`)
  console.log(`Documents are stored in: ${documentsBaseDir}/<year>/`)
  console.log(`Metadata DB is stored in: ${metadataDbPath}`)
})
