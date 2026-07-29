const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/documents', (req, res) => {
  const { documents = [] } = req.body || {}

  console.log('Received documents:', documents.length)
  documents.forEach((document, index) => {
    console.log(`[${index + 1}] ${document.name} | tags: ${document.tags.join(', ') || '-'} | metadata:`, document.metadata || {})
  })

  res.json({
    ok: true,
    received: documents.length,
    message: 'Documents received successfully',
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'docscanner-api' })
})

app.listen(port, () => {
  console.log(`Docscanner API listening on http://localhost:${port}`)
})
