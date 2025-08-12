import 'dotenv/config';
import logger from './logger';
import { initializeDatabase } from '../lib/database';
import { ensureDefaultUser } from './storage';
// Force production mode to disable Express HTML views
// Deployment: 2025-08-12 - Fix authentication issue
process.env.NODE_ENV = 'production';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerRoutes } from './routes';
import { storage } from './storage';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { sendWhatsAppMessage } from "./whatsapp";
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Mobile Repair Tracker API', version: '1.0.0' },
  },
  apis: ['./backend/server/routes.ts'],
};
const swaggerSpecs = swaggerJsdoc(swaggerOptions);

const app = express();

// Inject ngrok-skip-browser-warning header for all responses
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// 1. Global middleware to force JSON Content-Type and ignore Accept headers
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Set trust proxy to 1 for ngrok usage (fixes express-rate-limit warning)
app.set('trust proxy', 1);

// 3. Remove all host-based routing/hostname checks (delete whitelist logic)
// CORS whitelist for local and ngrok frontend
// const whitelist = [
//   'http://localhost:8080',
//   'https://positive-kodiak-friendly.ngrok-free.app' // Reserved ngrok domain
// ];

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://ritheshh-cmyk.github.io",
  "https://positive-kodiak-friendly.ngrok-free.app",
  "https://expensoo-clean-ptqif388n-ritheshs-projects-2bddf162.vercel.app",
  "https://expensoo-clean.vercel.app",
  "https://callmemobiles.vercel.app",
  "https://callmemobiles-3smo36zn2-ritheshs-projects-2bddf162.vercel.app",
  "https://callmemobiles-oksut9m43-ritheshs-projects-2bddf162.vercel.app",
  "https://callmemobiles-dhtj8d7sf-ritheshs-projects-2bddf162.vercel.app"
];

// Enhanced CORS configuration with wildcard support for Vercel domains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel deployment URLs with wildcard support
    if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      logger.info(`✅ CORS: Allowing Vercel domain: ${origin}`);
      return callback(null, true);
    }
    
    // Allow all localhost and ngrok domains for development
    if (origin.match(/^https?:\/\/(localhost|.*\.ngrok.*)/)) {
      logger.info(`✅ CORS: Allowing development domain: ${origin}`);
      return callback(null, true);
    }
    
    logger.warn(`❌ CORS: Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "ngrok-skip-browser-warning",
    "Cache-Control"
  ]
}));

// Enhanced OPTIONS preflight handler with better logging
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  logger.info(`🔄 CORS Preflight: ${req.method} ${req.url} from ${origin}`);
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// 4. Fallback middleware to allow all hosts (host-agnostic)
app.use((req, res, next) => { next(); });

// Middleware
app.use(express.json());
app.use(helmet());
// Temporarily disable rate limiting for testing
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Enhanced error handling with comprehensive logging
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error(`❌ Server Error [${status}]: ${message}`, {
    url: req.url,
    method: req.method,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    stack: err.stack
  });
  
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    error: message,
    status: status,
    timestamp: new Date().toISOString()
  });
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mobile Repair Tracker Backend is running' });
});

// Friendly root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NO TENSION BACKEND IS WORKING LIKE A ROCK MANNN' });
});

// --- WhatsApp Cloud API Webhook Integration ---
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "rithesh_12";

// Meta calls this to verify the webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("✅ WhatsApp Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    logger.error("❌ WhatsApp Webhook verification failed.");
    res.sendStatus(403);
  }
});

// Meta calls this for real messages
app.post("/webhook", (req, res) => {
  logger.info("📥 New WhatsApp event:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// --- Bill Create Endpoint ---
app.post('/api/bills', async (req, res) => {
  try {
    const bill = await storage.createBill(req.body); // Implement this in storage if missing
    res.json(bill);
    io.emit('billCreated', bill);
    // --- WhatsApp Notification ---
    try {
      const phone = bill.mobile || req.body.mobile || "7989002273";
      const message = `Hello ${bill.customerName || req.body.customerName}, your bill of ₹${bill.total || req.body.total} is ready! Thank you for choosing us.`;
      await sendWhatsAppMessage(phone, message);
      logger.info(`✅ WhatsApp bill notification sent to ${phone}`);
    } catch (waErr) {
      logger.error('❌ WhatsApp notification failed:', (waErr as any).message || waErr);
    }
  } catch (error: any) {
    logger.error('Bill creation error:', error);
    res.status(500).json({ error: 'Failed to create bill', details: error?.message || error });
  }
});

// Register routes and start server
export async function startServer() {
  try {
    // Initialize database schema before anything else
    await initializeDatabase();

    // Ensure admin user exists and has password lucky@777
    await ensureDefaultUser('admin', 'lucky@777', 'admin');

    // Register all API routes
    await registerRoutes(app, io);

    // Catch-all 404 for /api/* (must be last)
    app.use('/api', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
    
    // Socket.IO connection handling
    io.on('connection', (socket) => {
      logger.info('Client connected: ' + socket.id);
      
      socket.on('disconnect', () => {
        logger.info('Client disconnected: ' + socket.id);
      });
    });

    // Ensure JWT secret is loaded from env
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required!');
    }

    const PORT = process.env.PORT || 10000;

    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 API endpoints available at: http://localhost:${PORT}/api`);
    });
    
    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export the necessary components for testing
export { app, server, io };
export default app;

startServer();
