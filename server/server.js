require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const app = require('./src/app');

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'].filter(Boolean),
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  socket.on('join-admin-room', () => {
    socket.join('admin-alerts');
    console.log(`Socket ${socket.id} joined admin-alerts`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const serverListener = server.listen(PORT, () => {
  console.log(`✅  Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Verify SMTP email transporter on startup (non-blocking)
  const { verifyTransporter } = require('./src/utils/email');
  verifyTransporter().catch(() => {
    // Already logged inside verifyTransporter — no action needed here.
  });
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`❌  Unhandled Rejection:`, err);
  serverListener.close(() => process.exit(1));
});
