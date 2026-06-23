import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { product, title, image, price, size, color, quantity }

      // ── Add item — if same product+size exists, increase qty ─────────────────
      addItem: (item) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.product === item.product && i.size === item.size && i.color === item.color
        );

        if (existingIndex > -1) {
          const updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + item.quantity,
          };
          set({ items: updated });
        } else {
          set({ items: [...items, item] });
        }
      },

      // ── Remove item completely ────────────────────────────────────────────────
      removeItem: (product, size, color) => {
        set({
          items: get().items.filter(
            (i) => !(i.product === product && i.size === size && i.color === color)
          ),
        });
      },

      // ── Update quantity ───────────────────────────────────────────────────────
      updateQuantity: (product, size, color, quantity) => {
        if (quantity < 1) return get().removeItem(product, size, color);
        set({
          items: get().items.map((i) =>
            i.product === product && i.size === size && i.color === color
              ? { ...i, quantity }
              : i
          ),
        });
      },

      // ── Clear all items ───────────────────────────────────────────────────────
      clearCart: () => set({ items: [] }),

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
