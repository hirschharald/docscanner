import React, { useState } from "react";
import type { Document } from "@/types";
import { removeDocuments } from "@/utils/storage";

const yearOptions = Array.from(
  { length: 11 },
  (_, index) => new Date().getFullYear() - index,
);
const categoryOptions = ["Haus", "Steuer", "Bank", "Privat", "Sonstiges"];

interface MetaDataProps {
  documents: Document[];
  onClose: () => void;
  onUpdate: (updatedDocument: Document) => void;
  onArchive: () => void;
}

export const MetadataCard = React.memo<MetaDataProps>(
  ({ documents, onClose, onArchive, onUpdate }) => {
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const handleSave = () => {
      // Implement save logic here

      documents.forEach((document) => {
        document.tags.push(`Jahr:${selectedYear}`);
        document.tags.push(`Kategorie:${selectedCategory}`);
        console.log(
          `Document ${document.id} updated with tags:`,
          document.tags,
        );
      onUpdate(document)
      onArchive();
    });
    removeDocuments(documents)
      
      // add all to archive    onArchive(documents);
      // if success remove all from documents list and localstore
      onArchive();
      // onDelete(documents.map((doc) => doc.id));
      // onClose();
    };
    const handleCancel = () => {
      // Implement cancel logic here
      onClose();
    };

    return (
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3>Dokumente kategorisieren</h3>
            </div>

            <div className="modal-body d-flex flex-column gap-2 p-3">
              <label className="form-label fw-semibold">Jahr:</label>
              <select
                className="form-select"
                value={selectedYear}
                style={{ marginBottom: "1rem" }}
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
                style={{ marginBottom: "1rem", marginRight: "1rem" }}
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
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancel}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MetadataCard.displayName = "MetadataCard";
