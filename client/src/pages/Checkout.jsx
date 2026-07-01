import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, CreditCard, Tag, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import TestHelper from '../components/TestHelper';

const getIsoCode = (countryName) => {
  if (!countryName) return 'US';
  const map = {
    "United States": "US",
    "United Kingdom": "GB",
    "Canada": "CA",
    "Australia": "AU",
    "Bangladesh": "BD"
  };
  return map[countryName.trim()] || 'US'; 
};

// ─── Stripe Init (safe guard) ────────────────────────────────────────────────
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  console.error(
    '⚠️ STRIPE CONFIGURATION ERROR ⚠️\n' +
    'The Stripe Publishable Key is undefined. Please ensure:\n' +
    '1. You have a .env file in the root of your client directory.\n' +
    '2. It contains VITE_STRIPE_PUBLIC_KEY=pk_test_...\n' +
    '3. You have restarted your development server.'
  );
}

const COUNTRIES = [
  'Argentina',
  'Australia',
  'Bangladesh',
  'Brazil',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Denmark',
  'Egypt',
  'France',
  'Germany',
  'India',
  'Indonesia',
  'Ireland',
  'Italy',
  'Japan',
  'Kenya',
  'Malaysia',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Philippines',
  'Portugal',
  'Saudi Arabia',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Thailand',
  'Turkey',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
];

const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

// ─── Helper Components ────────────────────────────────────────────────────────
const PriceSummary = ({ subtotal, shippingCost, tax, finalTotal }) => (
  <div className="space-y-2 text-sm text-neutral-600">
    <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-neutral-900">${subtotal.toFixed(2)}</span></div>
    <div className="flex justify-between"><span>Shipping</span><span className="font-medium text-neutral-900">${shippingCost.toFixed(2)}</span></div>
    <div className="flex justify-between"><span>Tax (8%)</span><span className="font-medium text-neutral-900">${tax.toFixed(2)}</span></div>
    <div className="flex justify-between text-base font-bold text-neutral-900 pt-3 border-t border-neutral-200">
      <span>Total</span><span>${finalTotal.toFixed(2)}</span>
    </div>
  </div>
);

const PlaceOrderButton = ({ isProcessing, stripe, elements, paymentMethod, finalTotal, onClick, hidden, id }) => {
  const isCardNotReady = paymentMethod === 'card' && (!stripe || !elements);
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={isCardNotReady || isProcessing}
      className={`w-full btn-primary btn-lg rounded-xl ${hidden ? 'sr-only' : ''}`}
    >
      {isProcessing ? 'Processing...' : `Place Order • $${finalTotal.toFixed(2)}`}
    </button>
  );
};

// ─── Child Component (Stripe isolated form) ──────────────────────────────────
const EmbeddedPaymentForm = ({
  orderId,
  formData,
  shippingMethod,
  setShippingMethod,
  shippingCost,
  subtotal,
  paymentMethod,
  setPaymentMethod,
  onProcessingChange,
}) => {
  const stripe    = useStripe();
  const elements  = useElements();
  const { items, clearCart } = useCartStore();
  const navigate  = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);

  // Sync processing state upward so parent can lock its buttons
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  const tax        = Number((subtotal * 0.08).toFixed(2));
  const finalTotal = subtotal + shippingCost + tax;

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();

    if (!stripe || !elements || isProcessing) {
      return;
    }

    if (!formData.fullName || !formData.address || !formData.phone || !formData.city || !formData.state || !formData.zip) {
      return toast.error('Please fill in all shipping details');
    }

    setIsProcessing(true);

    try {
      const orderData = {
        cartItems: items.map(i => ({
          product:  i.product,
          title:    i.title,
          image:    i.image,
          price:    Number(i.price),
          quantity: Number(i.quantity),
          size:     i.size,
          color:    i.color,
        })),
        shippingAddress: {
          fullName:   formData.fullName,
          street:     formData.address,
          city:       formData.city,
          state:      formData.state,
          postalCode: formData.zip,
          country:    formData.country || 'United States',
        },
        shippingPrice: shippingCost,
        paymentMethod,
      };

      if (paymentMethod === 'card') {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: `${window.location.origin}/order-complete`,
            shipping: {
              name: formData.fullName,
              phone: formData.phone,
              address: {
                line1: formData.address,
                city: formData.city,
                state: formData.state,
                postal_code: formData.zip,
              }
            },
            payment_method_data: {
              billing_details: {
                name:  formData.fullName || 'Guest',
                phone: formData.phone,
                address: {
                  line1:       formData.address || '',
                  city:        formData.city || '',
                  state:       formData.state || '',
                  postal_code: formData.zip || '',
                  country:     getIsoCode(formData.country),
                },
              },
            },
          },
        });

        if (error) {
          console.error("Payment Error:", error.message);
          toast.error(error.message);
          setIsProcessing(false);
          return;
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          clearCart();
          window.location.href = `/order-complete?session_id=${paymentIntent.id}`;
        }
      } else if (paymentMethod === 'paypal') {
        toast.success('Redirecting to PayPal...');
        setIsProcessing(false);
      } else {
        orderData.isPaid = false;
        await api.post('/orders', orderData);
        clearCart();
        navigate('/order-complete');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Checkout failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Shipping Method ── */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Shipping Method</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shipping"
              value="standard"
              checked={shippingMethod === 'standard'}
              onChange={() => setShippingMethod('standard')}
              className="w-4 h-4 accent-neutral-900"
              disabled={isProcessing}
            />
            <span className="text-sm font-medium text-neutral-900">Standard Shipping</span>
          </div>
          <span className="text-sm font-medium text-neutral-700">${(subtotal > 100 ? 0 : 9.99).toFixed(2)}</span>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="shipping"
              value="urgent"
              checked={shippingMethod === 'urgent'}
              onChange={() => setShippingMethod('urgent')}
              className="w-4 h-4 accent-neutral-900"
              disabled={isProcessing}
            />
            <span className="text-sm font-medium text-neutral-900">Expedited Shipping</span>
          </div>
          <span className="text-sm font-medium text-neutral-700">$15.00</span>
        </label>
      </div>

      {/* ── Payment Method ── */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <CreditCard size={15} className="text-neutral-500" />
          Payment Method
        </h3>

        {/* Credit / Debit Card */}
        <div className={`border rounded-lg p-3 transition-colors ${paymentMethod === 'card' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              className="w-4 h-4 accent-neutral-900"
              disabled={isProcessing}
            />
            <span className="text-sm font-medium text-neutral-900">Credit / Debit Card</span>
          </label>

          {paymentMethod === 'card' && (
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <PaymentElement options={{ layout: 'tabs', fields: { billingDetails: { address: 'never' } } }} />
            </div>
          )}
        </div>

        {/* PayPal */}
        <div className={`border rounded-lg p-3 transition-colors ${paymentMethod === 'paypal' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={() => setPaymentMethod('paypal')}
              className="w-4 h-4 accent-neutral-900"
              disabled={isProcessing}
            />
            <span className="text-sm font-medium text-neutral-900">PayPal</span>
          </label>
          {paymentMethod === 'paypal' && (
            <p className="mt-2 text-xs text-neutral-500 ml-7">You will be redirected to PayPal to complete your purchase securely.</p>
          )}
        </div>
      </div>

      {/* ── Price breakdown + Place Order (rendered inside form for mobile) ── */}
      <div className="lg:hidden bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <PriceSummary subtotal={subtotal} shippingCost={shippingCost} tax={tax} finalTotal={finalTotal} />
        <PlaceOrderButton
          isProcessing={isProcessing}
          stripe={stripe}
          elements={elements}
          paymentMethod={paymentMethod}
          finalTotal={finalTotal}
          onClick={handlePlaceOrder}
        />
      </div>

      {/* expose handler upward so the right-column button can also call it */}
      <PlaceOrderButton
        isProcessing={isProcessing}
        stripe={stripe}
        elements={elements}
        paymentMethod={paymentMethod}
        finalTotal={finalTotal}
        onClick={handlePlaceOrder}
        hidden
        id="place-order-trigger"
      />
    </div>
  );
};

// ─── Parent Component (CheckoutPage) ──────────────────────────────────────────
const CheckoutPage = () => {
  const { items, totalPrice } = useCartStore();
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const [shippingMethod, setShippingMethod] = useState('standard');
  const [clientSecret, setClientSecret]     = useState('');
  const [orderId, setOrderId]               = useState('');
  const [countrySearch, setCountrySearch]   = useState('United States');
  const [showCountries, setShowCountries]   = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isFormProcessing, setIsFormProcessing] = useState(false);

  const subtotal    = totalPrice();
  const shippingCost = shippingMethod === 'urgent' ? 15.00 : (subtotal > 100 ? 0 : 9.99);
  const tax         = Number((subtotal * 0.08).toFixed(2));
  const finalTotal  = subtotal + shippingCost + tax;

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => c.trim().toLowerCase().includes(countrySearch.trim().toLowerCase()));
  }, [countrySearch]);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const hasInitialized = useRef(false);
  const countryDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setShowCountries(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pull Client Secret exactly ONCE on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (items.length === 0) { navigate('/cart'); return; }
    if (!stripePromise)     { setClientSecret('unconfigured'); return; }

    const fetchIntent = async () => {
      try {
        const { data } = await api.post('/payment/create-payment-intent', {
          userId: user?._id,
          cartItems: items.map(i => ({
            product:  i.product,
            quantity: i.quantity,
            price:    i.price,
            title:    i.title,
            size:     i.size,
            image:    i.image,
          })),
          shippingPrice: shippingMethod === 'urgent' ? 15.00 : (totalPrice() > 100 ? 0 : 9.99),
        });
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
      } catch (err) {
        console.error('Failed to fetch payment intent:', err);
        toast.error('Could not initialise payment. Please try again.');
      }
    };

    fetchIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable Options object
  const stripeOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: { theme: 'stripe' }
    };
  }, [clientSecret]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto" />
          <p className="mt-4 text-neutral-600">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] pt-24 pb-16 flex items-center justify-center">
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          ⚠️ Payment system is currently unconfigured. Please add{' '}
          <code className="font-mono bg-red-100 px-1 rounded">VITE_STRIPE_PUBLIC_KEY</code>{' '}
          to your <code className="font-mono bg-red-100 px-1 rounded">client/.env</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 mb-10 uppercase">
          <Link to="/cart" className="hover:text-neutral-900 transition-colors">Shopping Cart</Link>
          <ChevronRight size={14} />
          <span className="text-neutral-900">Checkout</span>
          <ChevronRight size={14} />
          <span>Order Complete</span>
        </nav>

        {/* Development Mode Badge */}
        {import.meta.env.MODE === 'development' && (
          <div className="mb-8 flex items-center justify-between p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">DEVELOPMENT MODE - Use test cards</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Use Stripe test card numbers (like 4242 4242 4242 4242) for checkout flow verification.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT COLUMN — Contact / Shipping / Payment */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* Contact & Shipping details */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-5">Billing & Shipping</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                      disabled={isFormProcessing}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                      placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      disabled={isFormProcessing}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                      placeholder="+1 (555) 000-0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    disabled={isFormProcessing}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                    placeholder="123 Fashion Ave, Suite 100" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange}
                      disabled={isFormProcessing}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                      placeholder="New York" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange}
                      disabled={isFormProcessing}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                      placeholder="NY" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">ZIP</label>
                    <input type="text" name="zip" value={formData.zip} onChange={handleChange}
                      disabled={isFormProcessing}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                      placeholder="10001" />
                  </div>

                  <div className="relative w-full" ref={countryDropdownRef}>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Country</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="country"
                        id="country"
                        value={countrySearch}
                        onChange={(e) => {
                          setCountrySearch(e.target.value);
                          setFormData(prev => ({ ...prev, country: e.target.value }));
                          setShowCountries(true);
                        }}
                        onFocus={() => setShowCountries(true)}
                        disabled={isFormProcessing}
                        className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 outline-none transition-all disabled:opacity-60"
                        placeholder="Search for your country..."
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                        <ChevronDown size={16} />
                      </span>
                    </div>
                    {showCountries && (
                      <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-md border border-neutral-100 rounded-lg shadow-xl custom-scrollbar">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((c) => (
                            <li
                              key={c}
                              onClick={() => {
                                setCountrySearch(c);
                                setFormData(prev => ({ ...prev, country: c }));
                                setShowCountries(false);
                              }}
                              className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors font-medium"
                            >
                              {c}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-2 text-sm text-neutral-400 text-center font-medium">No countries found</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stripe Elements Provider - Mounted exactly once */}
            {clientSecret && stripeOptions ? (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <EmbeddedPaymentForm
                  orderId={orderId}
                  formData={formData}
                  shippingMethod={shippingMethod}
                  setShippingMethod={setShippingMethod}
                  shippingCost={shippingCost}
                  subtotal={subtotal}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  onProcessingChange={setIsFormProcessing}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center p-6 border border-neutral-200 rounded-md bg-neutral-50 animate-pulse">
                <p className="text-sm font-medium text-neutral-500">Initializing secure checkout...</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Order Summary + Totals */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white/80 backdrop-blur-md border border-neutral-100 rounded-xl shadow-sm p-6 sticky top-24 space-y-6">

              <h2 className="text-xl font-bold text-neutral-900">Order Summary</h2>

              <div className="space-y-4 pt-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-1">
                    <div className="relative h-16 w-16 shrink-0 z-10">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover rounded-md border border-neutral-200" />
                      <span className="absolute -top-2 -right-2 z-50 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-white shadow-sm">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 truncate">{item.title}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Size: {item.size}{item.color && ` | ${item.color}`}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-neutral-900 whitespace-nowrap">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount code */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    disabled={isFormProcessing}
                    placeholder="Discount code"
                    className="w-full pl-8 pr-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none transition disabled:opacity-60"
                  />
                </div>
                <button
                  disabled={isFormProcessing}
                  className="px-4 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
                >
                  Apply
                </button>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 text-sm text-neutral-600 border-t border-neutral-100 pt-4">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-neutral-900">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span className="font-medium text-neutral-900">${shippingCost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax (8%)</span><span className="font-medium text-neutral-900">${tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-bold text-neutral-900 pt-3 border-t border-neutral-200">
                  <span>Total</span><span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={() => document.getElementById('place-order-trigger')?.click()}
                disabled={isFormProcessing}
                className="w-full btn-primary btn-lg rounded-xl flex items-center justify-center gap-2"
              >
                {isFormProcessing ? 'Processing...' : `Place Order • $${finalTotal.toFixed(2)}`}
              </button>

              <p className="text-center text-xs text-neutral-400">
                🔒 Secured by Stripe · 256-bit SSL Encryption
              </p>
            </div>
          </div>

        </div>
      </div>
      <TestHelper
        onAutofill={(data) => {
          setFormData(prev => ({ ...prev, ...data }));
          if (data.country) {
            setCountrySearch(data.country);
          }
        }}
      />
    </div>
  );
};

export default CheckoutPage;
