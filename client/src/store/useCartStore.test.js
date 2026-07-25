import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from './useCartStore';

// Stub window.localStorage for Node test environment to satisfy Zustand persist middleware
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', storageMock);

// Mock API service to prevent network calls during store unit testing
vi.mock('../services/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('Unit Testing: Zustand Shopping Cart Store (useCartStore)', () => {
  const sampleItem1 = {
    product: 'prod_1',
    title: 'Classic Vintage Hoodie',
    image: '/images/hoodie.jpg',
    price: 49.99,
    size: 'M',
    color: 'Black',
    quantity: 1,
  };

  const sampleItem2 = {
    product: 'prod_2',
    title: 'Minimalist Cotton Tee',
    image: '/images/tee.jpg',
    price: 25.00,
    size: 'L',
    color: 'White',
    quantity: 2,
  };

  beforeEach(() => {
    storageMock.clear();
    // Reset store state before every test
    useCartStore.setState({ items: [], isCartOpen: false });
  });

  describe('Adding Items (addItem)', () => {
    it('should add a new item to an empty cart', () => {
      useCartStore.getState().addItem(sampleItem1);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(sampleItem1);
      expect(useCartStore.getState().totalItems()).toBe(1);
      expect(useCartStore.getState().totalPrice()).toBe(49.99);
    });

    it('should increment quantity when adding an item with matching product, size, and color', () => {
      useCartStore.getState().addItem(sampleItem1);
      useCartStore.getState().addItem({ ...sampleItem1, quantity: 2 });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
      expect(useCartStore.getState().totalItems()).toBe(3);
      expect(useCartStore.getState().totalPrice()).toBe(49.99 * 3);
    });

    it('should preserve state immutability when adding items', () => {
      const initialItems = useCartStore.getState().items;
      useCartStore.getState().addItem(sampleItem1);
      const updatedItems = useCartStore.getState().items;

      expect(updatedItems).not.toBe(initialItems);
    });
  });

  describe('Updating Item Quantities (updateQuantity)', () => {
    beforeEach(() => {
      useCartStore.getState().addItem(sampleItem1);
      useCartStore.getState().addItem(sampleItem2);
    });

    it('should update the quantity of a specific item', () => {
      useCartStore.getState().updateQuantity('prod_1', 'M', 'Black', 5);

      const items = useCartStore.getState().items;
      const updatedItem = items.find(
        (i) => i.product === 'prod_1' && i.size === 'M' && i.color === 'Black'
      );
      expect(updatedItem.quantity).toBe(5);
      expect(useCartStore.getState().totalItems()).toBe(7); // 5 + 2
    });

    it('should remove the item if quantity is updated to less than 1', () => {
      useCartStore.getState().updateQuantity('prod_1', 'M', 'Black', 0);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product).toBe('prod_2');
    });

    it('should maintain state immutability when updating quantity', () => {
      const prevItems = useCartStore.getState().items;
      useCartStore.getState().updateQuantity('prod_1', 'M', 'Black', 4);
      const nextItems = useCartStore.getState().items;

      expect(nextItems).not.toBe(prevItems);
      expect(nextItems[0]).not.toBe(prevItems[0]);
    });
  });

  describe('Removing Items (removeItem)', () => {
    beforeEach(() => {
      useCartStore.getState().addItem(sampleItem1);
      useCartStore.getState().addItem(sampleItem2);
    });

    it('should remove an item by product, size, and color', () => {
      useCartStore.getState().removeItem('prod_1', 'M', 'Black');

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product).toBe('prod_2');
      expect(useCartStore.getState().totalItems()).toBe(2);
    });

    it('should maintain state immutability when removing items', () => {
      const prevItems = useCartStore.getState().items;
      useCartStore.getState().removeItem('prod_1', 'M', 'Black');
      const nextItems = useCartStore.getState().items;

      expect(nextItems).not.toBe(prevItems);
      expect(prevItems).toHaveLength(2);
      expect(nextItems).toHaveLength(1);
    });
  });
});
