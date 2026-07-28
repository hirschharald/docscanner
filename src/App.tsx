import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PwaInstallBanner } from '@/components/PwaInstallBanner'
import { useDocuments } from '@/hooks/useDocuments'
import { useTheme } from '@/hooks/useTheme'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@/styles/app.css'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const ScanPage = lazy(() => import('@/pages/ScanPage').then((m) => ({ default: m.ScanPage })))
const UploadPage = lazy(() => import('@/pages/UploadPage').then((m) => ({ default: m.UploadPage })))

const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Lädt…</span>
    </div>
  </div>
)

function App() {
  const { theme, toggleTheme } = useTheme()
  const { documents, addDocument, removeDocument, updateDocument, cropDocument } = useDocuments()

  return (
    <BrowserRouter>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <HomePage
                    documents={documents}
                    onDelete={removeDocument}
                    onRename={(id, name) => updateDocument(id, { name })}
                    onCrop={cropDocument}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="/scan"
              element={
                <ErrorBoundary>
                  <ScanPage onAdd={addDocument} />
                </ErrorBoundary>
              }
            />
            <Route
              path="/upload"
              element={
                <ErrorBoundary>
                  <UploadPage onAdd={addDocument} />
                </ErrorBoundary>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <PwaInstallBanner />
    </BrowserRouter>
  )
}

export default App
