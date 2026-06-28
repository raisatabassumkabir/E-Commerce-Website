import React from 'react';
import { Sparkles } from 'lucide-react';

const TestHelper = ({ onAutofill }) => {
  // Only render in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  const handleAutofill = () => {
    console.log("Test Autofill Active");
    if (onAutofill) {
      onAutofill({
        fullName: 'Test Cardholder',
        phone: '+1 (555) 555-4242',
        address: '4242 Stripe Way',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm bg-[#FDFBF9]/90 backdrop-blur-md border border-[#E5E0D8] rounded-xl shadow-lg p-5 border-l-4 border-l-amber-500 animate-fade-in transition-all hover:shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" />
          Test Assistant
        </h4>
      </div>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
        Populate the checkout billing and shipping fields with simulated test data to bypass manual typing.
      </p>
      <button
        onClick={handleAutofill}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-semibold tracking-wide shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
      >
        Autofill Success Card
      </button>
    </div>
  );
};

export default TestHelper;
