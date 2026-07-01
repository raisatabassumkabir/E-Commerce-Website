import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true, // Always send cookies (httpOnly JWT)
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor: handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any cached auth state — the token has expired or is invalid.
      // Import useAuthStore dynamically to avoid circular deps.
      import('../store/useAuthStore').then(({ useAuthStore }) => {
        useAuthStore.getState().clearUser();
      });
    }
    return Promise.reject(error);
  }
);

export default api;
