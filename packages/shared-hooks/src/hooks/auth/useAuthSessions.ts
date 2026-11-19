import { useCallback, useState } from "react";
import { getStorage } from "../../storage";
import { useSharedAuthStore as useAuthStore } from "../../store/useAuthStore";
import {
  fetchAuthSessions,
  revokeAuthSession,
  submitLogoutAll,
  type AuthSessionItem,
} from "../../services/auth/logout.service";

export function useAuthSessions() {
  const [sessions, setSessions] = useState<AuthSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const clearAuthState = useAuthStore((state) => state.logout);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchAuthSessions();
      setSessions(Array.isArray(list) ? list : []);
      return list;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await revokeAuthSession(sessionId);
      setSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? { ...item, revokedAt: new Date().toISOString() }
            : item,
        ),
      );
      return res;
    } finally {
      setRevokingId(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    setIsLoggingOutAll(true);
    try {
      await submitLogoutAll();
    } finally {
      clearAuthState();
      await getStorage().removeItem("accessToken");
      await getStorage().removeItem("refreshToken");
      setIsLoggingOutAll(false);
    }
  }, [clearAuthState]);

  return {
    sessions,
    isLoading,
    revokingId,
    isLoggingOutAll,
    loadSessions,
    revokeSession,
    logoutAll,
  };
}

