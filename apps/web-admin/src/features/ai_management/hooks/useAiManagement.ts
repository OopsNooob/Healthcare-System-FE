import { useState, useCallback, useEffect } from "react";
import i18n from "@/i18n";
import { extractApiErrorMessage, type PaginatedResult } from "@/lib/api";
import {
  getDocumentList,
  deleteDocument,
  archiveAiDocument,
  approveAiDocument,
  rejectAiDocument,
  activateAiDocument,
  replaceAiDocumentVersion,
  updateAiDocument,
  getKnowledgeCandidates,
  proposeKnowledgeCandidate,
  promoteKnowledgeCandidate,
  rejectKnowledgeCandidate,
  getAllAiFeedbacks,
  verifyAiFeedback,
  type DocumentItem,
  type DocumentStatus,
  type KnowledgeCandidateItem,
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
      setError(extractApiErrorMessage(loadError));
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

export function useDocumentMutations() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveDoc = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await approveAiDocument(id);
    } catch (err) {
      setError(extractApiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectDoc = useCallback(async (id: string, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      return await rejectAiDocument(id, reason);
    } catch (err) {
      setError(extractApiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const activateDoc = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await activateAiDocument(id);
    } catch (err) {
      setError(extractApiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const replaceDocVersion = useCallback(
    async (
      id: string,
      file: File,
      title?: string,
      validUntil?: string | null,
    ) => {
      setLoading(true);
      setError(null);
      try {
        return await replaceAiDocumentVersion(id, file, title, validUntil);
      } catch (err) {
        setError(extractApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const archiveDoc = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await archiveAiDocument(id);
    } catch (err) {
      setError(extractApiErrorMessage(err));
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
        setError(extractApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    approveDoc,
    rejectDoc,
    activateDoc,
    replaceDocVersion,
    archiveDoc,
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
      setError(i18n.t("apiErrors.INVALID_ID"));
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      return await deleteDocument(id);
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError));
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
      setError(extractApiErrorMessage(err));
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

export function useKnowledgeCandidates(params: {
  locale?: string;
  enabled?: boolean;
} = {}) {
  const [isLoading, setLoading] = useState(false);
  const [isMutating, setMutating] = useState(false);
  const [data, setData] = useState<KnowledgeCandidateItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const locale = params.locale ?? "vi-VN";

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getKnowledgeCandidates(locale);
      setData(items);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!params.enabled) return;
    const timer = window.setTimeout(() => {
      void loadCandidates();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.enabled, loadCandidates]);

  const propose = useCallback(
    async (input: { pmid: string; title: string; sourceUrl: string }) => {
      setMutating(true);
      setError(null);
      try {
        const created = await proposeKnowledgeCandidate(input, locale);
        await loadCandidates();
        return created;
      } catch (err) {
        setError(extractApiErrorMessage(err));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [loadCandidates, locale],
  );

  const promote = useCallback(
    async (id: string) => {
      setMutating(true);
      setError(null);
      try {
        const res = await promoteKnowledgeCandidate(id);
        await loadCandidates();
        return res;
      } catch (err) {
        setError(extractApiErrorMessage(err));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [loadCandidates],
  );

  const reject = useCallback(
    async (id: string, reason?: string) => {
      setMutating(true);
      setError(null);
      try {
        const res = await rejectKnowledgeCandidate(id, reason);
        await loadCandidates();
        return res;
      } catch (err) {
        setError(extractApiErrorMessage(err));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [loadCandidates],
  );

  return {
    data,
    isLoading,
    isMutating,
    error,
    refresh: loadCandidates,
    propose,
    promote,
    reject,
  };
}
