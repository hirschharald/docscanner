import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import type { Document } from "@/types";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { useDocuments } from "@/hooks/useDocuments";
import { useTheme } from "@/hooks/useTheme";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@/styles/app.css";
import { fetchSystemHealth } from "@/utils/api";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const ScanPage = lazy(() =>
  import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })),
);
const UploadPage = lazy(() =>
  import("@/pages/UploadPage").then((m) => ({ default: m.UploadPage })),
);

const PageLoader = () => (
  <div
    className="d-flex justify-content-center align-items-center"
    style={{ minHeight: "60vh" }}
  >
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Lädt…</span>
    </div>
  </div>
);

function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    localDocuments,
    archivedDocuments,
    addDocument,
    removeDocument,
    cropDocument,
    updateDocument,
    toArchive,
  } = useDocuments();

  // in App():
  const [health, setHealth] = useState({
    backend: false,
    db: false,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    const runCheck = async () => {
      const next = await fetchSystemHealth();
      if (!active) return;
      setHealth({
        backend: next.backend,
        db: next.db,
        loading: false,
      });
    };

    void runCheck();
    const timer = setInterval(() => {
      void runCheck();
    }, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleUpdate = useCallback((updatedDocument: Document ) => {
    updateDocument(updatedDocument.id, {
      name: updatedDocument.name,
      tags: updatedDocument.tags,
    });
  }, [updateDocument]);

  const handleArchive = useCallback(() => {
    toArchive();
  }, [toArchive]);

  return (
    <BrowserRouter>
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        backendAvailable={health.backend}
        dbAvailable={health.db}
        statusLoading={health.loading}
      />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <HomePage
                    archivedDocuments={archivedDocuments}
                    onDelete={removeDocument}
                    onUpdate={(id, name, tags) =>
                      updateDocument(id, { name, tags })
                    }
                    onCrop={cropDocument}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="/scan"
              element={
                <ErrorBoundary>
                  <ScanPage
                    localDocuments={localDocuments}
                    onAdd={addDocument}
                    onDelete={removeDocument}
                    onUpdate={handleUpdate}
                    onArchive={handleArchive}
                  />
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
  );
}

export default App;
