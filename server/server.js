require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorMiddleware');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const userRoutes = require('./src/routes/userRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

// Connect to MongoDB
connectDB();

const app = express();

const { stripeWebhook } = require('./src/controllers/paymentController');

// ── Stripe webhook MUST use raw body ──────────────────────────────────────────
// Mount webhook route BEFORE express.json() so the raw body is preserved
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static uploads if fallback local storage is used
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In development allow any localhost port (Vite may shift from 5173 → 5174 etc.)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL].filter(Boolean)
  : [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
    ].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
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
const { protect, adminOnly } = require('./src/middleware/authMiddleware');
const { uploadProductImages } = require('./src/middleware/uploadMiddleware');

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

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅  Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`❌  Unhandled Rejection:`, err);
  server.close(() => process.exit(1));
});
