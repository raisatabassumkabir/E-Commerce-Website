const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Payment features will not work.');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
