import React, { useEffect, useState, useCallback } from "react";
import type { Document } from "@/types";
import { formatDate } from "@/utils/storage";
import { CropModal } from "@/components/CropModal";

interface DocumentModalProps {
  document: Document | null;
  onClose: () => void;
  onCropSave?: (id: string, dataUrl: string) => void;
}

export const DocumentModal = React.memo<DocumentModalProps>(
  ({ document, onClose, onCropSave }) => {
    const [cropping, setCropping] = useState(false);
    const API_DOC_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/documents`


    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      if (document) window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [document, onClose]);

    const handleCropConfirm = useCallback(
      (croppedUrl: string) => {
        if (document && onCropSave) onCropSave(document.id, croppedUrl);
        setCropping(false);
      },
      [document, onCropSave],
    );

    if (!document) return null;

    const handleDownload = () => {
      const a = window.document.createElement("a");
      a.href = API_DOC_URL + '/' + document.id;
      a.download = document.name;
      a.click();
    };

    const metadataTags = document.tags.filter((tag) => tag.includes(":"));
    const isPdf =
      document.dataUrl?.startsWith("data:application/pdf") ||
      document.name.toLowerCase().endsWith(".pdf");

    if (cropping) {
      return (
        <CropModal
          imageSrc={API_DOC_URL + '/' + document.id}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropping(false)}
        />
      );
    }

    return (
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-xl modal-dialog-centered"
          
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-truncate">{document.name}</h5>
              <button
                className="btn-close"
                onClick={onClose}
                aria-label="Schließen"
              />
            </div>
            <div className="modal-body p-2 text-center bg-dark">
              {isPdf ? (
                <iframe
                  // src={document.dataUrl}
                  src={API_DOC_URL + '/' + document.id}
                  title={document.name}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    height: "70vh",
                    borderRadius: "0.375rem",
                    border: "none",
                  }}
                />
              ) : (
                <img
                  // src={document.dataUrl}
                  src={API_DOC_URL + '/' + document.id}
                  alt={document.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    borderRadius: "0.375rem",
                  }}
                />
              )}
            </div>
            <div className="modal-footer justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <small className="text-muted d-block">
                  {formatDate(document.createdAt)} ·{" "}
                  {document.type === "scan" ? "📷 Scan" : "📁 Upload"}
                </small>
                {metadataTags.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {metadataTags.map((tag) => (
                      <span key={tag} className="badge bg-light text-dark">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="d-flex gap-2">
                {onCropSave && (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setCropping(true)}
                  >
                    ✂️ Zuschneiden
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDownload}
                >
                  ⬇ Herunterladen
                </button>
                <button className="btn btn-secondary btn-sm" onClick={onClose}>
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DocumentModal.displayName = "DocumentModal";
