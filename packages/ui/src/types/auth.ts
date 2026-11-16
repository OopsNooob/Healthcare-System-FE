export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  adminRole?: AdminRole;
  avatar?: string;
}

export type AppRole = "admin" | "doctor" | "patient";
export type AdminRole = "ai_admin" | "user_admin" | "super_admin";

export function normalizeAdminRole(role?: string | null): AdminRole {
  if (role === "super_admin") return "super_admin";
  if (role === "ai_admin" || role === "ai_manager") return "ai_admin";
  if (role === "user_admin" || role === "user_manager") return "user_admin";
  return "user_admin";
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User, token: string, refreshToken: string) => void;
  updateCurrentUser: (payload: Partial<User>) => void;
  logout: () => void;
  hydrate: () => void;
}
