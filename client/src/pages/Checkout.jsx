import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Load Stripe (ensure VITE_STRIPE_PUBLIC_KEY is set in .env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const CheckoutContent = ({ shippingMethod, setShippingMethod }) => {
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [paymentMethod, setPaymentMethod] = useState('card'); // card | cod | mfs
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phone: '',
    address: '',
    district: '',
    area: '',
  });

  const subtotal = totalPrice();
  const shippingCost = shippingMethod === 'urgent' ? 15.00 : (subtotal > 100 ? 0 : 9.99);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const finalTotal = subtotal + shippingCost + tax;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.address || !formData.phone) {
      return toast.error("Please fill in all shipping details");
    }

    setLoading(true);

    try {
      // Common order payload
      const orderData = {
        cartItems: items.map(i => ({
          product: i.product,
          title: i.title,
          image: i.image,
          price: Number(i.price),
          quantity: Number(i.quantity),
          size: i.size,
          color: i.color,
        })),
        shippingAddress: {
          fullName: formData.fullName,
          street: formData.address,
          city: formData.district,
          state: formData.area,
          postalCode: '0000', // Simplified
          country: 'BD', // Simplified
        },
        shippingPrice: shippingCost,
        paymentMethod
      };

      if (paymentMethod === 'card') {
        if (!stripe || !elements) return;

        // We already have clientSecret fetched in the parent, Elements context handles it
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            // Stripe Hosted redirect logic relies on this
            return_url: `${window.location.origin}/payment-success`,
            payment_method_data: {
              billing_details: {
                name: formData.fullName,
                phone: formData.phone,
              }
            }
          }
        });

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        
        // Note: With confirmPayment, Stripe redirects to return_url immediately upon success.
        // We do not reach here. Our backend must handle order creation via webhook, 
        // OR the success page must verify payment intent and create the order.
        // For COD/MFS, we handle it directly below:
      } else if (paymentMethod === 'paypal') {
        // PayPal redirect placeholder
        toast.success("Redirecting to PayPal...");
        // In a real integration, backend creates a PayPal order and redirects
      } else {
        // Fallback for other methods if added later
        orderData.isPaid = false;
        await api.post('/orders/create', orderData);
        clearCart();
        navigate('/payment-success');
      }

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF9] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 mb-8 uppercase">
          <Link to="/cart" className="hover:text-brand-900 transition-colors">Shopping Cart</Link>
          <ChevronRight size={14} />
          <span className="text-brand-900">Checkout</span>
          <ChevronRight size={14} />
          <span>Order Complete</span>
        </nav>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Billing & Shipping */}
          <div className="lg:col-span-7 space-y-8">
            <section>
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-6">Billing & Shipping</h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                    <input 
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full bg-white border border-neutral-200 rounded-lg p-3 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-shadow"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                    <input 
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-white border border-neutral-200 rounded-lg p-3 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-shadow"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Address</label>
                  <input 
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-3 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-shadow"
                    placeholder="123 Fashion Ave, Suite 100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">District</label>
                    <select 
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      className="w-full bg-white border border-neutral-200 rounded-lg p-3 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-shadow"
                    >
                      <option value="">Select District</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Thana / Area</label>
                    <select 
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      className="w-full bg-white border border-neutral-200 rounded-lg p-3 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-shadow"
                    >
                      <option value="">Select Area</option>
                      <option value="Gulshan">Gulshan</option>
                      <option value="Banani">Banani</option>
                      <option value="Dhanmondi">Dhanmondi</option>
                    </select>
                  </div>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white/70 backdrop-blur-md border border-neutral-100 rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-display font-bold text-neutral-900 mb-6">Order Summary</h2>
              
              {/* Product List */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-md border border-neutral-200">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-md bg-neutral-100" />
                      <span className="absolute -top-2 -right-2 z-10 flex items-center justify-center rounded-full bg-neutral-500 text-white text-[10px] w-5 h-5 shadow-sm">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 truncate">{item.title}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Size: {item.size} {item.color && `| ${item.color}`}</p>
                    </div>
                    <div className="text-sm font-semibold text-neutral-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Selection */}
              <div className="border-t border-b border-neutral-200 py-4 mb-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="shipping" 
                      value="standard"
                      checked={shippingMethod === 'standard'}
                      onChange={() => setShippingMethod('standard')}
                      className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 border-neutral-300" 
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Standard Shipping (3-5 Business Days)</p>
                      <p className="text-xs text-neutral-500">Standard Courier</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">$9.99</span>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="shipping" 
                      value="urgent"
                      checked={shippingMethod === 'urgent'}
                      onChange={() => setShippingMethod('urgent')}
                      className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 border-neutral-300" 
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Expedited Shipping (1-2 Business Days)</p>
                      <p className="text-xs text-neutral-500">Urgent Delivery</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">$15.00</span>
                </label>
              </div>
              
              {/* Payment Methods */}
              <div className="border-b border-neutral-200 pb-4 mb-4 space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">Payment Method</h3>

                {/* Express Checkout */}
                <div className="mb-4">
                  <ExpressCheckoutElement onConfirm={() => {}} />
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-neutral-200"></div>
                    <span className="flex-shrink-0 mx-4 text-neutral-400 text-xs uppercase tracking-wider">Or pay with</span>
                    <div className="flex-grow border-t border-neutral-200"></div>
                  </div>
                </div>
                
                {/* Credit Card */}
                <div className={`border rounded-lg p-3 transition-colors ${paymentMethod === 'card' ? 'border-neutral-900 bg-neutral-50/50' : 'border-neutral-200'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" name="payment" value="card"
                      checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')}
                      className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 border-neutral-300" 
                    />
                    <span className="text-sm font-medium text-neutral-900">Credit / Debit Card</span>
                  </label>
                  {paymentMethod === 'card' && (
                    <div className="mt-4 bg-white p-3 border border-neutral-200 rounded-md">
                      <PaymentElement options={{ layout: 'tabs' }} />
                    </div>
                  )}
                </div>

                {/* PayPal Placeholder */}
                <div className={`border rounded-lg p-3 transition-colors ${paymentMethod === 'paypal' ? 'border-neutral-900 bg-neutral-50/50' : 'border-neutral-200'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" name="payment" value="paypal"
                      checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')}
                      className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 border-neutral-300" 
                    />
                    <span className="text-sm font-medium text-neutral-900">PayPal</span>
                  </label>
                  {paymentMethod === 'paypal' && (
                    <p className="mt-2 text-xs text-neutral-500 ml-7">You will be redirected to PayPal to complete your purchase securely.</p>
                  )}
                </div>

              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm text-neutral-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-neutral-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium text-neutral-900">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span className="font-medium text-neutral-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-neutral-900 pt-3 border-t border-neutral-200">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full btn-primary btn-lg rounded-xl"
              >
                {loading ? 'Processing...' : `Place Order • $${finalTotal.toFixed(2)}`}
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const Checkout = () => {
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState('');
  const [shippingMethod, setShippingMethod] = useState('standard');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchIntent = async () => {
      try {
        const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const shippingCost = shippingMethod === 'urgent' ? 15.00 : (subtotal > 100 ? 0 : 9.99);
        
        const { data } = await api.post('/payment/create-payment-intent', {
          cartItems: items.map(i => ({ 
            product: i.product, 
            quantity: i.quantity, 
            price: i.price, 
            title: i.title, 
            size: i.size, 
            image: i.image 
          })),
          shippingPrice: shippingCost,
        });
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Failed to fetch payment intent:", error);
      }
    };

    fetchIntent();
  }, [items, shippingMethod, navigate]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#171717',
      borderRadius: '8px',
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <CheckoutContent shippingMethod={shippingMethod} setShippingMethod={setShippingMethod} />
    </Elements>
  );
};

export default Checkout;
