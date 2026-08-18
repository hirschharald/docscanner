import { useState, useCallback, useEffect } from "react";
import type { Document } from "@/types";
import {
  deleteDocumentInBackend,
  fetchMetadataFromBackend,
  updateDocumentInBackend,
  uploadDocumentsToBackend,
} from "@/utils/api";
import { loadDocuments, saveDocuments, generateId } from "@/utils/storage";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<Document[]>([]);

  const refreshAll = useCallback(async () => {
    // Load documents from local storage and backend metadata, then merge them
    const localDocuments = await loadDocuments();

    try {
      const backendMetadata = await fetchMetadataFromBackend();

      const metadataById = new Map(
        backendMetadata.map((entry) => [entry.id, entry]),
      );

      /////////////////////////   Merge local documents with backend metadata
      const mergedDocuments = localDocuments.map((document) => {
        const metadata = metadataById.get(document.id);

        if (!metadata) {
          return document;
        }

        return {
          ...document,
          tags: Array.from(
            new Set([...(document.tags ?? []), ...(metadata.tags ?? [])]),
          ),
          name: document.name || metadata.name || "Dokument",
          createdAt: document.createdAt || metadata.createdAt || Date.now(),
          metadata: metadata.metadata ?? {},
        } as Document;
      });
      setDocuments(mergedDocuments);
      //////////////////////////////////////////////////////////////////
      const archived = backendMetadata.map((entry) => ({
        id: entry.id,
        name: entry.name || "Dokument",
        dataUrl: entry.fileName || "",
        type: entry.type || "image",
        createdAt: entry.createdAt || Date.now(),
        tags: entry.tags || [],
        metadata: entry.metadata || {},
        isArchived: entry.isArchived ?? false,
      })) as Document[];

      // setDocuments(mergedDocuments);
      setArchivedDocuments(archived);
      // await saveDocuments(mergedDocuments);
    } catch {
      setDocuments(localDocuments);
      setArchivedDocuments([]);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  //
  const addDocument = useCallback(
    (
      name: string,
      dataUrl: string,
      type: Document["type"],
      tags: string[] = [],
    ) => {
      const doc: Document = {
        id: generateId(),
        name,
        dataUrl,
        type,
        createdAt: Date.now(),
        tags,
      };

      setDocuments((prev) => {
        const updated = [doc, ...prev];
        // save documents to local storage
        void saveDocuments(updated);
        return updated;
      });

      return doc;
    },
    [refreshAll],
  );

  const addDocsToArchive = useCallback(
    (
      name: string,
      dataUrl: string,
      type: Document["type"],
      tags: string[] = [],
    ) => {
      void (async () => {
        try {
          const docs = await loadDocuments();
          await uploadDocumentsToBackend(docs);
          setDocuments([]);
          await saveDocuments([]);
        } catch {
          // Intentionally swallow backend errors to keep the UI responsive.
        } finally {
          await refreshAll();
        }
      })();
    },
    [refreshAll],
  );

  const removeDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        void saveDocuments(updated);
        return updated;
      });

      void deleteDocumentInBackend(id)
        .catch(() => undefined)
        .finally(() => {
          void refreshAll();
        });
    },
    [refreshAll],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<Pick<Document, "name" | "tags">>) => {
      setDocuments((prev) => {
        const updated = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
        void saveDocuments(updated);
        return updated;
      });

      void updateDocumentInBackend(id, patch)
        .catch(() => undefined)
        .finally(() => {
          void refreshAll();
        });
    },
    [refreshAll],
  );

  const cropDocument = useCallback((id: string, dataUrl: string) => {
    setDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, dataUrl } : d));
      void saveDocuments(updated);
      return updated;
    });
  }, []);

  return {
    localDocuments: documents,
    archivedDocuments,
    addDocument,
    removeDocument,
    updateDocument,
    cropDocument,
    toArchive: addDocsToArchive,
  };
}
