import { describe, it, expect } from 'vitest';

// Example utility function to test
function calculateTotal(itemsPrice, shippingPrice, taxPrice) {
  return Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));
}

describe('Unit Testing: Cart Calculations', () => {
  it('should correctly sum items, shipping, and tax', () => {
    const result = calculateTotal(23.00, 5.00, 1.84);
    expect(result).toBe(29.84);
  });

  it('should handle zero shipping and tax', () => {
    const result = calculateTotal(100.00, 0, 0);
    expect(result).toBe(100.00);
  });
});
