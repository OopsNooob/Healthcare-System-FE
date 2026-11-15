import { useState, useCallback, useEffect } from "react";
import type { PaginatedResult } from "@/lib/api";
import {
  getDocumentList,
  toggleDocumentStatus,
  deleteDocument,
  archiveAiDocument,
  indexAiDocument,
  ragIngestAiDocument,
  updateAiDocument,
  getAllAiFeedbacks,
  verifyAiFeedback,
  type DocumentItem,
  type DocumentStatus,
  type AiFeedbackItem,
} from "../services/ai-management.service";

export function useGetDocumentList(params: {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  search?: string;
  locale?: string;
} = {}) {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResult<DocumentItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocumentList(params);
      setData(res);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load documents",
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.status, params.search, params.locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  return {
    data,
    isLoading,
    error,
    refresh: loadList,
  };
}

export function useToggleDocumentStatus() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleStatus = useCallback(
    async (id: string, status: DocumentStatus) => {
      if (!id) {
        setError("Invalid document ID");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        return await toggleDocumentStatus(id, status);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to change document status",
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    toggleStatus,
    isLoading,
    error,
  };
}

export function useDocumentMutations() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archiveDoc = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await archiveAiDocument(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const indexDoc = useCallback(async (id: string, totalChunks = 0) => {
    setLoading(true);
    setError(null);
    try {
      return await indexAiDocument(id, totalChunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to index document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const ragIngestDoc = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await ragIngestAiDocument(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger ingestion");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDoc = useCallback(
    async (
      id: string,
      body: Parameters<typeof updateAiDocument>[1],
    ) => {
      setLoading(true);
      setError(null);
      try {
        return await updateAiDocument(id, body);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update document");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    archiveDoc,
    indexDoc,
    ragIngestDoc,
    updateDoc,
    isLoading,
    error,
  };
}

export function useDeleteDocument() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDoc = useCallback(async (id: string) => {
    if (!id) {
      setError("Invalid document ID");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      return await deleteDocument(id);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to delete document",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteDoc,
    isLoading,
    error,
  };
}

export function useAiFeedbackList(params: {
  page?: number;
  limit?: number;
  aiConversationId?: string;
  locale?: string;
  enabled?: boolean;
}) {
  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<AiFeedbackItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllAiFeedbacks(params);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load AI feedbacks",
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.aiConversationId, params.locale]);

  useEffect(() => {
    if (!params.enabled) return;
    const timer = window.setTimeout(() => {
      void loadFeedbacks();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.enabled, loadFeedbacks]);

  const submitVerify = useCallback(async (id: string) => {
    await verifyAiFeedback(id);
    await loadFeedbacks();
  }, [loadFeedbacks]);

  return {
    data,
    isLoading,
    error,
    refresh: loadFeedbacks,
    submitVerify,
  };
}
