import React, { useState, useMemo } from "react";
import type { Document } from "@/types";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentModal } from "@/components/DocumentModal";
import { ConfirmModal } from "@/components/ConfirmModal";

interface HomePageProps {
  archivedDocuments: Document[];
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, tags: string[]) => void;
  onCrop: (id: string, dataUrl: string) => void;
}
// load documents from backend metadata
export const HomePage = React.memo<HomePageProps>(
  ({ archivedDocuments, onDelete, onRename, onCrop }) => {
    const [query, setQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    const yearOptions = useMemo(
      () =>
        Array.from(
          new Set(
            archivedDocuments.flatMap((d) =>
              d.tags
                .filter((t) => t.startsWith("Jahr:"))
                .map((t) => t.replace("Jahr:", "")),
            ),
          ),
        ).sort((a, b) => Number(b) - Number(a)),
      [archivedDocuments],
    );
    const categoryOptions = useMemo(
      () =>
        Array.from(
          new Set(
            archivedDocuments.flatMap((d) =>
              d.tags
                .filter((t) => t.startsWith("Kategorie:"))
                .map((t) => t.replace("Kategorie:", "")),
            ),
          ),
        ).sort(),
      [archivedDocuments],
    );

    const filtered = useMemo(() => {
      if (query === "" && selectedYear === "" && selectedCategory === "") {
        return [];
      }
      return archivedDocuments.filter((d) => {
        const matchesQuery =
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

        const matchesYear =
          !selectedYear || d.tags.includes(`Jahr:${selectedYear}`);
        const matchesCategory =
          !selectedCategory || d.tags.includes(`Kategorie:${selectedCategory}`);

        return matchesQuery && matchesYear && matchesCategory;
      });
    }, [archivedDocuments, query, selectedYear, selectedCategory]);

    return (
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <h2 className="mb-0">📚 Dokumente</h2>
          <span className="badge bg-secondary fs-6">
            {filtered.length} Dokument{filtered.length !== 1 ? "e" : ""}
          </span>
        </div>

        <div className="row g-2 mb-4">
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Jahr</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Jahr filtern</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Kategorie</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Kategorie filtern</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Austeller</label>
            <div className="input-group">
              <span className="input-group-text">🔍</span>
              <input
                type="search"
                className="form-control"
                placeholder="Aussteller suchen"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="display-1">📭</div>
            <p className="mt-3 fs-5">
              {query || selectedYear || selectedCategory
                ? "Keine Dokumente gefunden."
                : "Noch keine Dokumente vorhanden."}
            </p>
            {!query && !selectedYear && !selectedCategory && (
              <div className="d-flex gap-2 justify-content-center">
                <a href="/scan" className="btn btn-primary">
                  📷 Scannen
                </a>
                <a href="/upload" className="btn btn-outline-primary">
                  📁 Hochladen
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
            {filtered.map((doc) => (
              <div key={doc.id} className="col">
                <DocumentCard
                // noMetadata={false}
                  document={doc}
                  // onDelete={onDelete}
                  onDelete={(id) => {
                    onDelete(id);
                    setSelectedDoc(doc)
                 
                  }}
                  onRename={onRename}
                  onView={setSelectedDoc}
                />
              </div>
            ))}
          </div>
        )}

        <DocumentModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onCropSave={(id, dataUrl) => {
            onCrop(id, dataUrl);
            setSelectedDoc((prev) => (prev ? { ...prev, dataUrl } : null));
          }}
        />

        <ConfirmModal
          open={!!selectedDoc}
          title="Dokument löschen?"
          message={`Möchten Sie das Dokument "${selectedDoc?.name}" wirklich löschen?`}
          onResult={(result) => {
            if (result && selectedDoc) {
              onDelete(selectedDoc.id);
            }
            setSelectedDoc(null);
          }}
        />
      </div>
    );
  },
);

HomePage.displayName = "HomePage";
