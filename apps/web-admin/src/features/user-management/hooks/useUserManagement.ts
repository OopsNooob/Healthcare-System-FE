import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@repo/ui/store/useAuthStore";
import i18n from "@/i18n";
import {
  extractApiErrorMessage,
  presenceSocket,
  SOCKET_EVENTS,
  updateSocketAuth,
} from "@/lib/api";
import {
  getUserManagement,
  getUserOperationalDetails,
  deactivateUser,
  type UserManagement,
  type UserOperationalDetails,
  banUser,
  type ApiBanUser,
  unbanUser,
  type ApiUnbanUser,
} from "../services/user-management.service";
import { deleteAdmin } from "../services/admin-management.service";

const initialUsers: UserManagement = {
  totalUser: 0,
  activeDoctors: 0,
  pendingVerifications: 0,
  bannedUsers: 0,
  totalPatients: 0,
  userList: [],
};

export function useUsers() {
  const accessToken = useAuthStore((state) => state.token);
  const [users, setUsers] = useState<UserManagement>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserManagement();
      setUsers(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load user data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadUsers]);

  useEffect(() => {
    const token = accessToken || localStorage.getItem("accessToken") || "";
    if (!token) {
      return;
    }

    updateSocketAuth(token);
    if (!presenceSocket.connected) {
      presenceSocket.connect();
    }

    const handlePresenceChanged = (payload: {
      userId?: string;
      status?: "online" | "offline";
    }) => {
      if (!payload?.userId) return;
      const isOnline = payload.status === "online";
      setUsers((prev) => ({
        ...prev,
        userList: prev.userList.map((item) =>
          item.id === payload.userId ? { ...item, isOnline } : item,
        ),
      }));
    };

    presenceSocket.on(
      SOCKET_EVENTS.presence.server.userStatusChanged,
      handlePresenceChanged,
    );

    return () => {
      presenceSocket.off(
        SOCKET_EVENTS.presence.server.userStatusChanged,
        handlePresenceChanged,
      );
    };
  }, [accessToken]);

  return {
    users,
    isLoading,
    error,
    refresh: loadUsers,
  };
}

export function useOperationalSummary(
  userId: string | null,
  role: "patient" | "doctor" | "admin" | null,
) {
  const [data, setData] = useState<UserOperationalDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !role) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);

      void getUserOperationalDetails(userId, role)
        .then((res) => {
          if (active) setData(res);
        })
        .catch((err) => {
          if (active) {
            setError(
              extractApiErrorMessage(err, "userManagement.errors.loadDetailsFailed"),
            );
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, role]);

  if (!userId || !role) {
    return { data: null, isLoading: false, error: null };
  }

  return { data, isLoading, error };
}

export function useDeactivateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDeactivateUser = useCallback(async (userId: string) => {
    if (!userId) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      return await deactivateUser(userId);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, "userManagement.errors.deactivateFailed"),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { submitDeactivateUser, isLoading, error };
}

export function useDeleteAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDeleteAdmin = useCallback(async (adminUserId: string) => {
    if (!adminUserId) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      return await deleteAdmin(adminUserId);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, "userManagement.errors.deleteAdminFailed"),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { submitDeleteAdmin, isLoading, error };
}

export function useBanUser() {
  const [response, setResponse] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBanUser = useCallback(async (payload: ApiBanUser) => {
    if (!payload.id) {
      setError(i18n.t("userManagement.errors.emptyRequiredFields"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await banUser(payload);
      setResponse(res);
      return res;
    } catch (loadError) {
      setError(
        extractApiErrorMessage(loadError, "userManagement.errors.banFailed"),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    submitBanUser,
    response,
    isLoading,
    error,
  };
}

export function useUnbanUser() {
  const [response, setResponse] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitUnbanUser = useCallback(async (payload: ApiUnbanUser) => {
    if (!payload.id) {
      setError(i18n.t("userManagement.errors.emptyRequiredFields"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await unbanUser(payload);
      setResponse(res);
      return res;
    } catch (loadError) {
      setError(
        extractApiErrorMessage(loadError, "userManagement.errors.unbanFailed"),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    submitUnbanUser,
    response,
    isLoading,
    error,
  };
}
