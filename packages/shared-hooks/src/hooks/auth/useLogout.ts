import { getStorage } from "../../storage";
import { useCallback } from "react";
import { useSharedAuthStore as useAuthStore } from "../../store/useAuthStore";
import { submitLogout } from "../../services/auth/logout.service";

export function useLogout() {
  const clearAuthState = useAuthStore((state) => state.logout);

  const logout = useCallback(async () => {
    try {
      await submitLogout();
    } finally {
      clearAuthState();
      await getStorage().removeItem("accessToken");
      await getStorage().removeItem("refreshToken");
    }
  }, [clearAuthState]);

  return { logout };
}
