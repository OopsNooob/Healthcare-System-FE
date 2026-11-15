import { useState, useCallback, useEffect } from "react";
import {
  getKeywordList,
  addKeyword,
  updateKeyword,
  deleteKeyword,
  checkBlacklistContent,
  type ApiKeywordList,
} from "../services/blacklist-keywords.service";

export function useGetKeywords() {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ApiKeywordList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getKeywordList({ page: 1, limit: 200 });
      setData(res);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load keyword list",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

export function useAddKeyword() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAddKeyword = useCallback(async (newKeyword: string) => {
    if (!newKeyword.trim()) {
      const message = "New keyword is empty!";
      setError(message);
      throw new Error(message);
    }
    setLoading(true);
    setError(null);
    try {
      return await addKeyword(newKeyword.trim());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to add keyword";
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    submitAddKeyword,
    isLoading,
    error,
  };
}

export function useUpdateKeyword() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitUpdateKeyword = useCallback(
    async (id: string, newKeyword: string) => {
      if (!id || !newKeyword.trim()) {
        const message = "Invalid keyword update payload";
        setError(message);
        throw new Error(message);
      }
      setLoading(true);
      setError(null);
      try {
        return await updateKeyword(id, newKeyword.trim());
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to update keyword";
        setError(message);
        throw loadError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    submitUpdateKeyword,
    isLoading,
    error,
  };
}

export function useDeleteKeyword() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDeleteKeyword = useCallback(async (id: string) => {
    if (!id) {
      const message = "Invalid keyword ID";
      setError(message);
      throw new Error(message);
    }
    setLoading(true);
    setError(null);
    try {
      return await deleteKeyword(id);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to delete keyword";
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    submitDeleteKeyword,
    isLoading,
    error,
  };
}

export function useCheckBlacklistContent() {
  const [isLoading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    flagged: boolean;
    flaggedWords: string[];
  } | null>(null);

  const checkContent = useCallback(async (content: string) => {
    if (!content.trim()) return null;
    setLoading(true);
    try {
      const res = await checkBlacklistContent(content.trim());
      setResult(res);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkContent,
    result,
    isLoading,
  };
}
