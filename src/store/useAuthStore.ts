/**
 * Auth store — persists the current user and handles login/logout.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, tokens, ApiUser } from "@/lib/api";

interface AuthStore {
  user: ApiUser | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { tokens: t, user } = await authApi.login(email, password);
          tokens.set(t.accessToken, t.refreshToken);
          set({ user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const { tokens: t, user } = await authApi.register(data);
          tokens.set(t.accessToken, t.refreshToken);
          set({ user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      loginWithGoogle: async (credential) => {
        set({ isLoading: true });
        try {
          const { tokens: t, user } = await authApi.googleLogin(credential);
          tokens.set(t.accessToken, t.refreshToken);
          set({ user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        const rt = tokens.getRefresh();
        if (rt) await authApi.logout(rt).catch(() => {});
        tokens.clear();
        set({ user: null });
      },

      setUser: (user) => set({ user }),

      /** Called on app init to validate stored token */
      rehydrate: async () => {
        const at = tokens.getAccess();
        if (!at) return;
        try {
          const { user } = await authApi.me();
          set({ user });
        } catch {
          tokens.clear();
          set({ user: null });
        }
      },
    }),
    {
      name: "inmogestion-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
