import { useState, useCallback, useEffect } from "react";
import type { Document } from "@/types";
import {
  deleteDocumentInBackend,
  fetchMetadataFromBackend,
  uploadDocumentsToBackend,
} from "@/utils/api";
import { loadDocuments, saveDocuments, generateId } from "@/utils/storage";

export const useDocuments = () => {
  const [localDocuments, setLocalDocuments] = useState<Document[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<Document[]>([]);

  const refreshAll = useCallback(async () => {
    // Load documents from local storage and backend metadata, then merge them
    const localDocuments = await loadDocuments();
    setLocalDocuments(localDocuments)
    

    try {
      const backendMetadata = await fetchMetadataFromBackend();

      const metadataById = new Map(
        backendMetadata.map((entry) => [entry.id, entry]),
      );
      /////////////////////////   Merge local documents with backend metadata
      // const mergedDocuments = backendMetadata.map((document) => {
      //   const metadata = metadataById.get(document.id);
      //   return {
      //     ...document,
      //     tags: metadata?.tags || [],
      //     name: document.name  || "Dokument",
      //     createdAt: document.createdAt || Date.now(),
      //     outputPath: metadata?.outputPath || document.dataUrl|| "",
      //     type: document.type || "image",
      //     isArchived: document.isArchived ?? false,
      //     metadata: document.metadata ?? {},
      //   } as Document;
      // });
      // console.log("Merged documents:", mergedDocuments);
      // setDocuments(mergedDocuments);
      //////////////////////////////////////////////////////////////////
      const archived = backendMetadata.map((entry) => ({
        id: entry.id,
        name: entry.name || "Dokument",
        dataUrl: entry.fileName || "",
        type: entry.type || "image",
        createdAt: entry.createdAt || Date.now(),
        outputPath: entry.outputPath || "",
        tags: entry.tags || [],
        metadata: entry.metadata || {},
        isArchived: entry.isArchived ?? false,
      })) as Document[];

      // setDocuments(mergedDocuments);
      setArchivedDocuments(archived);
      // await saveDocuments(mergedDocuments);
    } catch {
      setLocalDocuments([]);
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

      setLocalDocuments((prev) => {
        const updated = [doc, ...prev];
        // save documents to local storage
        void saveDocuments(updated);
        return updated;
      });

      return doc;
    },
    [refreshAll],
  );

  const addDocsToArchive = useCallback(() => {
    void (async () => {
      try {
        const docs = await loadDocuments();
        await uploadDocumentsToBackend(docs);
        setLocalDocuments([]);
        await saveDocuments([]);
      } catch {
        console.error("Failed to upload documents to backend");
      } finally {
        await refreshAll();
      }
    })();
  }, [refreshAll]);

  const removeDocument = useCallback(
    (id: string) => {
      setLocalDocuments((prev) => {
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
  // update document in local storage and backend
  const updateDocument = useCallback(
    (id: string, patch: Partial<Pick<Document, "name" | "tags">>) => {
      setLocalDocuments((prev) => {
        const updated = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
        void saveDocuments(updated);
        return updated;
      });

      // void updateDocumentInBackend(id, patch)
      //   .catch(() => undefined)
      //   .finally(() => {
      //     void refreshAll();
      //   });
    },
    [refreshAll],
  );

  const cropDocument = useCallback((id: string, dataUrl: string) => {
    setLocalDocuments((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, dataUrl } : d));
      void saveDocuments(updated);
      return updated;
    });
  }, []);

  return {
    localDocuments: localDocuments,
    archivedDocuments,
    addDocument,
    removeDocument,
    updateDocument,
    cropDocument,
    toArchive: addDocsToArchive,
  };
}
