import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const syncCart = async (items) => {
  try {
    const { useAuthStore } = await import('./useAuthStore');
    if (useAuthStore.getState().user) {
      await api.put('/auth/cart', { cart: items });
    }
  } catch (err) {
    console.error('Failed to sync cart:', err);
  }
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { product, title, image, price, size, color, quantity }
      isCartOpen: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // ── Add item — if same product+size exists, increase qty ─────────────────
      addItem: (item) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.product === item.product && i.size === item.size && i.color === item.color
        );

        let updated;
        if (existingIndex > -1) {
          updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + item.quantity,
          };
        } else {
          updated = [...items, item];
        }
        set({ items: updated });
        syncCart(updated);
      },

      // ── Remove item completely ────────────────────────────────────────────────
      removeItem: (product, size, color) => {
        const updated = get().items.filter(
          (i) => !(i.product === product && i.size === size && i.color === color)
        );
        set({ items: updated });
        syncCart(updated);
      },

      // ── Update quantity ───────────────────────────────────────────────────────
      updateQuantity: (product, size, color, quantity) => {
        if (quantity < 1) return get().removeItem(product, size, color);
        const updated = get().items.map((i) =>
          i.product === product && i.size === size && i.color === color
            ? { ...i, quantity }
            : i
        );
        set({ items: updated });
        syncCart(updated);
      },

      // ── Clear all items ───────────────────────────────────────────────────────
      clearCart: () => {
        set({ items: [] });
        syncCart([]);
      },

      // ── Computed values ───────────────────────────────────────────────────────
      totalItems: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),
      isEmpty: () => get().items.length === 0,
    }),
    {
      name: 'threadhaus-cart', // localStorage key
      partialize: (state) => ({ items: state.items }), // only persist items
    }
  )
);
