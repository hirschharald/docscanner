import express from 'express'
import cors from 'cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import 'dotenv/config'

const app = express()
const port = process.env.PORT ?? 3001
const documentsBaseDir = path.resolve(process.cwd(), process.env.DOCS_BASE_PATH || 'docs')
const metadataDbPath = path.resolve(process.cwd(), process.env.METADATA_DB_PATH || path.join(documentsBaseDir, 'metadata.db'))
let metadataDb

await fs.mkdir(documentsBaseDir, { recursive: true })
await fs.mkdir(path.dirname(metadataDbPath), { recursive: true })
metadataDb = new Database(metadataDbPath)

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
  await fs.mkdir(path.dirname(metadataDbPath), { recursive: true })

  metadataDb.exec(`
    CREATE TABLE IF NOT EXISTS metadata_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      year TEXT,
      fileName TEXT,
      outputPath TEXT,
      storedAt TEXT NOT NULL,
      bytes INTEGER
    )
  `)

  const legacyFilePath = path.resolve(process.cwd(), path.join(documentsBaseDir, 'metadata-db.json'))
  try {
    const legacyRaw = await fs.readFile(legacyFilePath, 'utf8')
    const legacyEntries = JSON.parse(legacyRaw)

    if (Array.isArray(legacyEntries) && legacyEntries.length > 0) {
      const insert = metadataDb.prepare(`
        INSERT OR REPLACE INTO metadata_entries (
          id, name, type, createdAt, tags, metadata, year, fileName, outputPath, storedAt, bytes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const transaction = metadataDb.transaction((entries) => {
        for (const entry of entries) {
          insert.run(
            entry.id,
            entry.name || 'document',
            entry.type || 'upload',
            entry.createdAt || Date.now(),
            JSON.stringify(entry.tags || []),
            JSON.stringify(entry.metadata || {}),
            entry.year || null,
            entry.fileName || null,
            entry.outputPath || null,
            entry.storedAt || new Date().toISOString(),
            entry.bytes || null,
          )
        }
      })

      transaction(legacyEntries)
      await fs.rename(legacyFilePath, `${legacyFilePath}.bak`).catch(() => undefined)
    }
  } catch {
    // no legacy data to migrate
  }
}

function loadMetadataDb() {
  const rows = metadataDb.prepare('SELECT * FROM metadata_entries ORDER BY createdAt DESC').all()
  return rows.map((row) => ({
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    metadata: JSON.parse(row.metadata || '{}'),
  }))
}
//  save a single metadata entry to the database
function saveMetadataEntry(record) {
  const insert = metadataDb.prepare(`
    INSERT OR REPLACE INTO metadata_entries (
      id, name, type, createdAt, tags, metadata, year, fileName, outputPath, storedAt, bytes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insert.run(
    record.id,
    record.name,
    record.type,
    record.createdAt,
    JSON.stringify(record.tags || []),
    JSON.stringify(record.metadata || {}),
    record.year || null,
    record.fileName || null,
    record.outputPath || null,
    record.storedAt || new Date().toISOString(),
    record.bytes || null,
  )
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

  saveMetadataEntry(record)
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

app.use(cors())
app.use(express.json({ limit: '10mb' }))

await initializeMetadataDb()

app.post('/api/documents', async (req, res) => {
  const { documents = [] } = req.body || {}

  console.log('Received documents:', documents.length)
  documents.forEach((document, index) => {
    console.log(`[${index + 1}] ${document.name} | tags: ${document.tags.join(', ') || '-'} | metadata:`, document.metadata || {})
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

app.get('/api/metadata', (_req, res) => {
  const metadata = loadMetadataDb()
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

app.listen(port, () => {
  console.log(`Docscanner API listening on http://localhost:${port}`)
  console.log(`Documents are stored in: ${documentsBaseDir}/<year>/`)
  console.log(`Metadata DB is stored in: ${metadataDbPath}`)
})
