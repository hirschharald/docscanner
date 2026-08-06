// import type { Document } from "@/types";
import { fetchMetadataFromBackend } from "@/utils/api";
import type { BackendMetadataEntry } from "@/types";

export async function loadDocumentsFromBackend(
  baseUrl?: string,
): Promise<BackendMetadataEntry[]> {

  try {
    const documents = await fetchMetadataFromBackend(baseUrl);
    if (documents.length > 0) {
      return documents;
    }
  } catch (error) {
    console.error("Error fetching metadata from backend:", error);
  }
  return [];
}
