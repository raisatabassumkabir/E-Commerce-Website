import { create } from 'zustand';
import api from '../services/api';
import { useCartStore } from './useCartStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false, // has the initial /me check completed?

  // ── Actions ──────────────────────────────────────────────────────────────────
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const guestCart = useCartStore.getState().items;
      const { data } = await api.post('/auth/login', { ...credentials, guestCart });
      set({ user: data.user, isLoading: false });
      if (data.cart) {
        useCartStore.setState({ items: data.cart });
      }
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const guestCart = useCartStore.getState().items;
      const { data } = await api.post('/auth/register', { ...formData, guestCart });
      set({ user: data.user, isLoading: false });
      if (data.cart) {
        useCartStore.setState({ items: data.cart });
      }
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
      useCartStore.getState().clearCart();
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, isLoading: false, isInitialized: true });
      if (data.user && data.user.cart) {
        useCartStore.setState({ items: data.user.cart });
      }
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
