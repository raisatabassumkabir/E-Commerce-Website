import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false, // has the initial /me check completed?

  // ── Actions ──────────────────────────────────────────────────────────────────
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', credentials);
      set({ user: data.user, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', formData);
      set({ user: data.user, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null });
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, isLoading: false, isInitialized: true });
    } catch {
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  clearUser: () => set({ user: null }),

  // ── Selectors ─────────────────────────────────────────────────────────────────
  isAuthenticated: () => !!get().user,
  isAdmin: () => get().user?.role === 'admin',
}));
