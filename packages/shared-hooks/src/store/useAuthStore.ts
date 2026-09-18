import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, User } from "@repo/shared-types"; // Assuming types are in shared-types, if not, we copy them
import { getStorage } from "../storage";

// Define locally if not yet in shared-types to avoid breaking
export type LocalUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
};

export type LocalAuthState = {
  user: LocalUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: LocalUser, token: string, refreshToken: string) => void;
  updateCurrentUser: (payload: Partial<LocalUser>) => void;
  logout: () => void;
  hydrate: () => void;
};

// Custom storage engine matching getStorage()
const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await getStorage().getItem(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await getStorage().setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await getStorage().removeItem(name);
  },
};

export const useSharedAuthStore = create<LocalAuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setUser: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        }),

      updateCurrentUser: (payload) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, ...payload }
            : state.user,
        })),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      hydrate: () => {},
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
