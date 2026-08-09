import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg

function normalizeEntry(entry = {}) {
  return {
    ...entry,
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    metadata: entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
  }
}

function parseJson(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function buildPoolConfig(connectionString) {
  if (connectionString) {
    return { connectionString }
  }

  return {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    user: process.env.PGUSER || process.env.DB_USER || 'docscanner',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'docscanner',
    database: process.env.PGDATABASE || process.env.DB_NAME || 'docscanner',
  }
}

export function createMetadataStore({ connectionString, documentsBaseDir, tableName = 'metadata_entries' }) {
  const pool = new Pool(buildPoolConfig(connectionString))
  const legacyFilePath = documentsBaseDir
    ? path.resolve(process.cwd(), path.join(documentsBaseDir, 'metadata.json'))
    : path.resolve(process.cwd(), 'metadata.json')

  async function waitForDatabase(retries = 15, delayMs = 1500) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        await pool.query('SELECT 1')
        return
      } catch (error) {
        if (attempt === retries) {
          throw error
        }

        await new Promise((resolve) => {
          setTimeout(resolve, delayMs)
        })
      }
    }
  }

  async function ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        "createdAt" BIGINT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        year TEXT,
        "fileName" TEXT,
        "outputPath" TEXT,
        "storedAt" TEXT NOT NULL,
        bytes BIGINT
      )
    `)
  }

  async function migrateLegacyEntries() {
    try {
      const legacyRaw = await fs.readFile(legacyFilePath, 'utf8')
      const legacyEntries = parseJson(legacyRaw, [])

      if (!Array.isArray(legacyEntries) || legacyEntries.length === 0) {
        return
      }

      for (const entry of legacyEntries) {
        if (!entry?.id) {
          continue
        }

        await pool.query(`
          INSERT INTO ${tableName} (
            id, name, type, "createdAt", tags, metadata, year, "fileName", "outputPath", "storedAt", bytes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            "createdAt" = EXCLUDED."createdAt",
            tags = EXCLUDED.tags,
            metadata = EXCLUDED.metadata,
            year = EXCLUDED.year,
            "fileName" = EXCLUDED."fileName",
            "outputPath" = EXCLUDED."outputPath",
            "storedAt" = EXCLUDED."storedAt",
            bytes = EXCLUDED.bytes
        `, [
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
        ])
      }

      await fs.rename(legacyFilePath, `${legacyFilePath}.bak`).catch(() => undefined)
    } catch {
      // no legacy data to migrate
    }
  }

  return {
    async initialize() {
      await waitForDatabase()
      await ensureSchema()
      await pool.query('SELECT 1')
      await migrateLegacyEntries()
    },

    async load() {
      const { rows } = await pool.query(`SELECT * FROM ${tableName} ORDER BY "createdAt" DESC`)
      return rows.map((row) => normalizeEntry({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      }))
    },

    async saveEntry(record) {
      const nextEntry = normalizeEntry(record)

      await pool.query(`
        INSERT INTO ${tableName} (
          id, name, type, "createdAt", tags, metadata, year, "fileName", "outputPath", "storedAt", bytes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          "createdAt" = EXCLUDED."createdAt",
          tags = EXCLUDED.tags,
          metadata = EXCLUDED.metadata,
          year = EXCLUDED.year,
          "fileName" = EXCLUDED."fileName",
          "outputPath" = EXCLUDED."outputPath",
          "storedAt" = EXCLUDED."storedAt",
          bytes = EXCLUDED.bytes
      `, [
        nextEntry.id,
        nextEntry.name,
        nextEntry.type,
        nextEntry.createdAt,
        JSON.stringify(nextEntry.tags || []),
        JSON.stringify(nextEntry.metadata || {}),
        nextEntry.year || null,
        nextEntry.fileName || null,
        nextEntry.outputPath || null,
        nextEntry.storedAt || new Date().toISOString(),
        nextEntry.bytes || null,
      ])

      return nextEntry
    },

    async getEntryById(id) {
      const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id])

      if (rows.length === 0) {
        return null
      }

      return normalizeEntry({
        ...rows[0],
        tags: Array.isArray(rows[0].tags) ? rows[0].tags : [],
        metadata: rows[0].metadata && typeof rows[0].metadata === 'object' ? rows[0].metadata : {},
      })
    },

    async updateEntry(id, patch = {}) {
      const currentEntry = await this.getEntryById(id)

      if (!currentEntry) {
        return null
      }

      const nextEntry = normalizeEntry({
        ...currentEntry,
        name: patch.name ?? currentEntry.name,
        type: patch.type ?? currentEntry.type,
        createdAt: patch.createdAt ?? currentEntry.createdAt,
        tags: Array.isArray(patch.tags) ? patch.tags : currentEntry.tags,
        metadata: {
          ...(currentEntry.metadata || {}),
          ...(patch.metadata || {}),
        },
        year: patch.year ?? currentEntry.year,
        fileName: patch.fileName ?? currentEntry.fileName,
        outputPath: patch.outputPath ?? currentEntry.outputPath,
        storedAt: patch.storedAt ?? currentEntry.storedAt ?? new Date().toISOString(),
        bytes: patch.bytes ?? currentEntry.bytes,
      })

      await this.saveEntry(nextEntry)
      return nextEntry
    },

    async deleteEntry(id) {
      const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id])
      return rowCount > 0
    },

    async close() {
      await pool.end()
    },
  }
}
