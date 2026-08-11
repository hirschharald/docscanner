import React, { useEffect } from "react";
interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onResult: (confirmed: boolean) => void;
}

export const ConfirmModal = React.memo<ConfirmModalProps>(
  ({ open, title = "Bitte bestätigen", message, onResult }) => {
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onResult(false);
        }
      };

      if (open) {
        window.addEventListener("keydown", handleKeyDown);
      }

      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onResult]);

    if (!open) return null;

    return (
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={() => onResult(false)}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Schließen"
                onClick={() => onResult(false)}
              />
            </div>

            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onResult(false)}
              >
                Nein
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onResult(true)}
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ConfirmModal.displayName = "Bestätigen";
