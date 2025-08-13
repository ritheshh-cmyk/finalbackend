"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
exports.startServer = startServer;
require("dotenv/config");
const logger_1 = __importDefault(require("./logger"));
const database_1 = require("../lib/database");
process.env.NODE_ENV = 'production';
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const routes_1 = require("./routes");
const storage_1 = require("./storage");
const helmet_1 = __importDefault(require("helmet"));
const whatsapp_1 = require("./whatsapp");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const supabase_realtime_service_1 = __importDefault(require("./supabase-realtime-service"));
const supabase_auth_routes_1 = __importDefault(require("./supabase-auth-routes"));
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'Mobile Repair Tracker API', version: '1.0.0' },
    },
    apis: ['./backend/server/routes.ts'],
};
const swaggerSpecs = (0, swagger_jsdoc_1.default)(swaggerOptions);
const app = (0, express_1.default)();
exports.app = app;
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
exports.io = io;
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});
app.set('trust proxy', 1);
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
            logger_1.default.info(`✅ CORS: Allowing Vercel domain: ${origin}`);
            return callback(null, true);
        }
        if (origin.match(/^https?:\/\/(localhost|.*\.ngrok.*)/)) {
            logger_1.default.info(`✅ CORS: Allowing development domain: ${origin}`);
            return callback(null, true);
        }
        logger_1.default.warn(`❌ CORS: Blocked origin: ${origin}`);
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
app.options('*', (req, res) => {
    const origin = req.headers.origin;
    logger_1.default.info(`🔄 CORS Preflight: ${req.method} ${req.url} from ${origin}`);
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});
app.use((req, res, next) => { next(); });
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpecs));
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    logger_1.default.error(`❌ Server Error [${status}]: ${message}`, {
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
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Mobile Repair Tracker Backend is running' });
});
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'NO TENSION BACKEND IS WORKING LIKE A ROCK MANNN' });
});
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "rithesh_12";
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        logger_1.default.info("✅ WhatsApp Webhook verified successfully!");
        res.status(200).send(challenge);
    }
    else {
        logger_1.default.error("❌ WhatsApp Webhook verification failed.");
        res.sendStatus(403);
    }
});
app.post("/webhook", (req, res) => {
    logger_1.default.info("📥 New WhatsApp event:", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});
app.post('/api/bills', async (req, res) => {
    try {
        const bill = await storage_1.storage.createBill(req.body);
        res.json(bill);
        io.emit('billCreated', bill);
        try {
            const phone = bill.mobile || req.body.mobile || "7989002273";
            const message = `Hello ${bill.customerName || req.body.customerName}, your bill of ₹${bill.total || req.body.total} is ready! Thank you for choosing us.`;
            await (0, whatsapp_1.sendWhatsAppMessage)(phone, message);
            logger_1.default.info(`✅ WhatsApp bill notification sent to ${phone}`);
        }
        catch (waErr) {
            logger_1.default.error('❌ WhatsApp notification failed:', waErr.message || waErr);
        }
    }
    catch (error) {
        logger_1.default.error('Bill creation error:', error);
        res.status(500).json({ error: 'Failed to create bill', details: error?.message || error });
    }
});
async function startServer() {
    try {
        await (0, database_1.initializeDatabase)();
        logger_1.default.info('🔄 Using Supabase Auth - default users managed via database migration');
        app.use('/api/auth', supabase_auth_routes_1.default);
        await (0, routes_1.registerRoutes)(app, io);
        app.use('/api', (req, res) => {
            res.status(404).json({ error: 'API endpoint not found' });
        });
        const realtimeService = new supabase_realtime_service_1.default(io);
        global.realtimeService = realtimeService;
        const requiredSupabaseEnvs = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
        for (const envVar of requiredSupabaseEnvs) {
            if (!process.env[envVar]) {
                throw new Error(`${envVar} environment variable is required for Supabase Auth!`);
            }
        }
        logger_1.default.info('✅ Supabase Auth environment variables verified');
        const PORT = process.env.PORT || 10000;
        server.listen(PORT, () => {
            logger_1.default.info(`✅ Server running on port ${PORT} with Supabase Auth`);
            logger_1.default.info(`🌐 Health check: http://localhost:${PORT}/health`);
            logger_1.default.info(`📊 API endpoints available at: http://localhost:${PORT}/api`);
            logger_1.default.info(`🔐 Supabase Auth endpoints: http://localhost:${PORT}/api/auth`);
            logger_1.default.info(`🔌 WebSocket server ready with Supabase integration`);
        });
        return server;
    }
    catch (error) {
        logger_1.default.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
;
exports.default = app;
startServer();
//# sourceMappingURL=index.js.map