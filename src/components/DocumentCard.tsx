import React, { useState, useEffect } from "react";
import type { Document } from "@/types";
import { formatDate } from "@/utils/storage";

const API_DOC_URL = `${import.meta.env.VITE_API_URL ?? "/api"}`;
// const DOCS_BASE_PATH = `${import.meta.env.VITE_DOCS_PATH ?? "/docs"}`;

const yearOptions = Array.from(
  { length: 11 },
  (_, index) => new Date().getFullYear() - index,
);
const categoryOptions = ["Haus", "Steuer", "Bank", "Privat", "Sonstiges"];

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, tags: string[]) => void;
  onView: () => void;
}

export const DocumentCard = React.memo<DocumentCardProps>(
  ({ document, onDelete, onRename, onView }) => {
    // Create a mapping of tags to their values for easy access
    const tagObject = document.tags.reduce<Record<string, string>>(
      (acc, tag) => {
        const separatorIndex = tag.indexOf(":");

        if (separatorIndex > 0) {
          const key = tag.slice(0, separatorIndex).trim();
          const value = tag.slice(separatorIndex + 1).trim();

          if (key && value) {
            acc[key] = value;
          }
        }

        return acc;
      },
      {},
    );

    const [editing, setEditing] = useState(false);
    const [imgPath, setImgPath] = useState(document.dataUrl ?? "");
    const [editName, setEditName] = useState(document.name);
    const [selectedYear, setSelectedYear] = useState(tagObject.Jahr ?? "");
    const [selectedCategory, setSelectedCategory] = useState(
      tagObject.Kategorie ?? "",
    );
    // get doument from backend if it is archived
    useEffect(() => {
      if (document.isArchived) {
        const fetchDocument = async () => {
          try {
            const response = await fetch(
              `${API_DOC_URL}/metadata/${document.id}`,
            );
            if (!response.ok) {
              throw new Error("Failed to fetch document");
            }
            // const blob = await response.blob();
            // const url = URL.createObjectURL(blob);
            await response
              .json()
              .then((res) => {
                // console.log(
                //   "metadata",
                //   res.metadata.fileName,
                //   res.metadata.year,
                // );
                setImgPath(
                  res.isArchived
                    ? `${API_DOC_URL}/documents/${res.metadata.id}`
                    : res.metadata.dataUrl,
                );
              })
              .catch((e) => console.log("Error fetching metadata:", e));
            // console.log(
            //   `Fetched document from backend: ${document.id}, URL: ${response.url}`,
            // );
          } catch (error) {
            console.error("Error fetching document:", error);
          }
        };
        void fetchDocument();
      }
    }, [document.id, document.isArchived]);

    const handleRename = () => {
      const normalizedName = editName.trim();

      if (normalizedName) {
        const nextTags = document.tags.filter(
          (tag) => !tag.startsWith("Jahr:") && !tag.startsWith("Kategorie:"),
        );

        if (selectedYear.trim()) {
          nextTags.push(`Jahr:${selectedYear.trim()}`);
        }
        if (selectedCategory.trim()) {
          nextTags.push(`Kategorie:${selectedCategory.trim()}`);
        }

        onRename(document.id, normalizedName, nextTags);
      }

      setEditing(false);
    };

    const handleCancel = () => {
      setEditing(false);
      setEditName(document.name);
      setSelectedYear(tagObject.Jahr ?? "");
      setSelectedCategory(tagObject.Kategorie ?? "");
    };

    const isPdf =
      document.dataUrl?.startsWith("data:application/pdf") ||
      document.name.toLowerCase().endsWith(".pdf");

    return (
      <div className="card doc-card shadow-sm h-100">
        {isPdf ? (
          <iframe
            title={document.name}
            src={API_DOC_URL + "/documents/" + document.id}
            className="doc-preview-img"
            onClick={() => onView()}
            style={{ border: "none", background: "#fff" }}
          />
        ) : (
          <img
            alt={imgPath ? imgPath : document.name}
            // src={API_DOC_URL + "/" + document.id}
            src={document.isArchived && document.outputPath ? API_DOC_URL + "/documents/" + document.id : document.dataUrl}
            title={document.name}
            className="doc-preview-img"
            onClick={() => onView()}
            style={{ border: "none", background: "#fff" }}
          />
        )}
        <div className="card-body d-flex flex-column gap-1 p-2">
          {editing ? (
            <div className="d-flex flex-column gap-2">
              <input
                className="form-control"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
                autoFocus
                placeholder="Name"
              />
              <label className="form-label fw-semibold">Jahr:</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <label className="form-label fw-semibold">Kategorie:</label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleRename}
                >
                  ✓
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancel}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <h6 className="card-title mb-0 text-truncate" title={document.name}>
              {document.name}
            </h6>
          )}

          <small className="text-muted">{formatDate(document.createdAt)}</small>

          {/* <div className="d-flex flex-wrap gap-1 mb-1">
            {document.tags.map((tag) => (
              <span key={tag} className="badge bg-secondary tag-badge">
                {tag}
              </span>
            ))}
          </div> */}
        </div>
        <div className="d-flex gap-1 mt-auto">
          <button
            className="btn btn-outline-primary btn-sm flex-fill"
            onClick={() => onView()}  
          >
            👁
          </button>
          {/* <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setEditing(true);
                }}
                title="Umbenennen"
              >
                ✏️
              </button> */}
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => onDelete(document.id)}
            title="Löschen"
          >
            🗑
          </button>
        </div>
      </div>
    );
  },
);

DocumentCard.displayName = "DocumentCard";
