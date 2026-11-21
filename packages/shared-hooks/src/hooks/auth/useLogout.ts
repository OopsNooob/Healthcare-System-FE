import { getStorage } from "../../storage";
import { useCallback } from "react";
import { useSharedAuthStore as useAuthStore } from "../../store/useAuthStore";
import { submitLogout } from "../../services/auth/logout.service";
import { disconnectAllSockets } from "../../api";

export function useLogout() {
  const clearAuthState = useAuthStore((state) => state.logout);

  const logout = useCallback(async () => {
    try {
      await submitLogout();
    } catch {
      // Ignore 401/network errors when revoking an already-expired session
    } finally {
      disconnectAllSockets();
      clearAuthState();
      await getStorage().removeItem("accessToken");
      await getStorage().removeItem("refreshToken");
    }
  }, [clearAuthState]);

  return { logout };
}
