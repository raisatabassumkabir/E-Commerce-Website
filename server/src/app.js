require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

const { stripeWebhook } = require('./controllers/paymentController');

// ── Stripe webhook MUST use raw body ──────────────────────────────────────────
// Mount webhook route BEFORE express.json() so the raw body is preserved
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static uploads if fallback local storage is used
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// ── Upload endpoint for product variant images ─────────────────────────────────
const { protect, adminOnly } = require('./middleware/authMiddleware');
const { uploadProductImages } = require('./middleware/uploadMiddleware');

app.post('/api/upload', protect, adminOnly, uploadProductImages.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const isLocal = !req.file.path.startsWith('http');
  const url = isLocal
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : req.file.path;
  res.status(200).json({ success: true, image: url, imageUrl: url });
});

// ── Error handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
