import React, { useState, useEffect } from "react";
import type { Document } from "@/types";
import { formatDate } from "@/utils/storage";

const API_DOC_URL = `${import.meta.env.VITE_API_URL ?? "/api"}/documents`;

const yearOptions = Array.from(
  { length: 11 },
  (_, index) => new Date().getFullYear() - index,
);
const categoryOptions = ["Haus", "Steuer", "Bank", "Privat", "Sonstiges"];

interface DocumentCardProps {
  documents: Document[];
  toArchive: (id: string) => void;
}

export const MetadataCard = React.memo<DocumentCardProps>(
  ({ documents, toArchive }) => {
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const handleSave = () => {
      // Implement save logic here
      documents.forEach((document) => {
        const updatedTags = [
          ...document.tags.filter(
            (tag) => !tag.startsWith("Jahr:") && !tag.startsWith("Kategorie:"),
          ),
          ...(selectedYear ? [`Jahr:${selectedYear}`] : []),
          ...(selectedCategory ? [`Kategorie:${selectedCategory}`] : []),
        ];
        toArchive(document.id);
      });
    };

    const handleCancel = () => {
      // Implement cancel logic here
    };

    return (
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ background: "rgba(68, 46, 46, 0.7)" }}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <h3>Dokumente kategorisieren</h3>

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
            <button className="btn btn-success btn-sm" onClick={handleSave}>
              ✓
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  },
);

MetadataCard.displayName = "MetadataCard";
