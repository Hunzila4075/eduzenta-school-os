import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db.js';
import { initializeDatabase } from './config/initDb.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import broadcastRoutes from './routes/broadcastRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (allowing requests from frontend origins & production railway frontend)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5176',
  'https://eduzenta-school-os-production.up.railway.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy Error: Origin not allowed.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API Route
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    service: 'Eduzenta SaaS Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.success,
      message: dbStatus.message,
      host: process.env.DB_HOST || 'localhost',
      name: process.env.DB_NAME || 'eduzenta_db'
    }
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/broadcasts', broadcastRoutes);

// Root API Endpoint
app.get('/', (req, res) => {
  res.send('Eduzenta School OS Backend Service API running...');
});

// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found', path: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS Error', message: err.message });
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Server Initialization & Startup Sequence
async function startServer() {
  try {
    // Force DB auto-migration and Super Admin seeding BEFORE listening
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`⚡ Eduzenta Backend API Server running on port ${PORT}`);
      console.log(`🔗 Health Check Endpoint: http://localhost:${PORT}/api/health`);
      console.log(`=================================================`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

startServer();
