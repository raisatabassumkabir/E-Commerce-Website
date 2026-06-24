import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useNavigate } from 'react-router-dom';

const CartDrawer = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col glass-dark shadow-brand-lg
          transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-brand-900" />
            <h2 className="text-lg font-semibold text-neutral-900">Your Cart</h2>
            <span className="badge-brand text-xs px-2 py-0.5 rounded-full">{totalItems()}</span>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-neutral-500 hover:text-red-600 transition-colors text-xs underline"
                id="cart-clear-btn"
              >
                Clear all
              </button>
            )}
            <button
              id="cart-drawer-close"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="text-center">Your cart is empty.<br />Start shopping to fill it up.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.product}-${item.size}-${item.color}-${idx}`} className="flex gap-4 glass-sm rounded-xl p-3 animate-slide-up">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-24 object-cover rounded-lg flex-shrink-0 bg-neutral-100"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-neutral-800 text-sm font-medium line-clamp-2 leading-snug">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-neutral-500 text-xs">Size: {item.size}</span>
                    {item.color && <span className="text-neutral-500 text-xs">· {item.color}</span>}
                  </div>
                  <p className="text-neutral-900 font-semibold text-sm mt-1">${item.price.toFixed(2)}</p>

                  <div className="flex items-center justify-between mt-3">
                    {/* Qty controls */}
                    <div className="flex border border-neutral-200 h-8 w-24 items-center justify-between">
                      <button
                        id={`qty-dec-${item.product}-${item.size}`}
                        type="button"
                        onClick={() => updateQuantity(item.product, item.size, item.color, item.quantity - 1)}
                        className="text-neutral-600 px-2 hover:text-neutral-900"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-neutral-900 font-semibold text-center text-sm w-8">{item.quantity}</span>
                      <button
                        id={`qty-inc-${item.product}-${item.size}`}
                        type="button"
                        onClick={() => updateQuantity(item.product, item.size, item.color, item.quantity + 1)}
                        className="text-neutral-600 px-2 hover:text-neutral-900"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      id={`remove-${item.product}-${item.size}`}
                      onClick={() => removeItem(item.product, item.size, item.color)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-neutral-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span className="text-neutral-900 font-bold text-xl">${totalPrice().toFixed(2)}</span>
            </div>
            <p className="text-neutral-500 text-xs text-center font-normal tracking-wide mt-1">Shipping & taxes calculated at checkout</p>
            <button id="cart-checkout-btn" onClick={handleCheckout} className="btn-primary btn-lg w-full rounded-xl">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
