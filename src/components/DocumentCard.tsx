import React, { useState } from "react";
import type { Document } from "@/types";
import { formatDate } from "@/utils/storage";

const yearOptions = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - index)
const categoryOptions = ['Haus', 'Steuer', 'Bank', 'Privat', 'Sonstiges']


interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, tags: string[]) => void;
  onView: (document: Document) => void;
}

export const DocumentCard = React.memo<DocumentCardProps>(
  ({ document, onDelete, onRename, onView }) => {
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
    const [editName, setEditName] = useState(document.name);
    const [selectedYear, setSelectedYear] = useState(tagObject.Jahr ?? "");
    const [selectedCategory, setSelectedCategory] = useState(tagObject.Kategorie ?? "");

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

    const isPdf = document.dataUrl.startsWith('data:application/pdf') || document.name.toLowerCase().endsWith('.pdf')

    return (
      <div className="card doc-card shadow-sm h-100">
        {isPdf ? (
          <iframe
            src={`http://localhost:3003/api/documents/${document.id}`}
            title={document.name}
            className="doc-preview-img"
            onClick={() => onView(document)}
            style={{ border: 'none', background: '#fff' }}
          />
        ) : (
          <img
            src={`http://localhost:3003/api/documents/${document.id}`}
            alt={document.name}
            className="doc-preview-img"
            onClick={() => onView(document)}
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
                <option key={year} value={year}>{year}</option>
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
                <option key={category} value={category}>{category}</option>
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
          <div className="d-flex flex-wrap gap-1 mb-1">
            {document.tags.map((tag) => (
              <span key={tag} className="badge bg-secondary tag-badge">
                {tag}
              </span>
            ))}
          </div>
          <div className="d-flex gap-1 mt-auto">
            <button
              className="btn btn-outline-primary btn-sm flex-fill"
              onClick={() => onView(document)}
            >
              👁 Ansehen
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setEditing(true);
              }}
              title="Umbenennen"
            >
              ✏️
            </button>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete(document.id)}
              title="Löschen"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    );
  },
);

DocumentCard.displayName = "DocumentCard";
