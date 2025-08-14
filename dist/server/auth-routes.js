"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireNotDemo = requireNotDemo;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const storage_js_1 = require("./storage.js");
const logger_1 = __importDefault(require("./logger"));
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: 'JWT_SECRET not set in environment' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        next();
    };
}
function requireNotDemo(req, res, next) {
    const user = req.user;
    if (user && user.role === 'demo') {
        return res.status(403).json({ error: 'Demo users cannot modify data' });
    }
    next();
}
const router = express_1.default.Router();
router.post('/login', (req, res) => {
    (async () => {
        const startTime = Date.now();
        const clientIP = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const origin = req.headers.origin;
        logger_1.default.info(`🔐 Login attempt started`, {
            ip: clientIP,
            userAgent,
            origin,
            timestamp: new Date().toISOString()
        });
        const { username, password } = req.body;
        if (!username || !password) {
            logger_1.default.warn(`❌ Login failed: Missing credentials`, {
                username: username ? '[PROVIDED]' : '[MISSING]',
                password: password ? '[PROVIDED]' : '[MISSING]',
                ip: clientIP,
                origin
            });
            return res.status(400).json({
                error: 'Username and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        logger_1.default.info(`🔍 Looking up user: ${username}`);
        const user = await storage_js_1.storage.getUserByUsername(username);
        if (!user) {
            logger_1.default.warn(`❌ Login failed: User not found`, {
                username,
                ip: clientIP,
                origin,
                duration: Date.now() - startTime
            });
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        logger_1.default.info(`👤 User found: ${username} (ID: ${user.id}, Role: ${user.role})`);
        let isValidPassword = false;
        try {
            logger_1.default.info(`🔒 Verifying password for user: ${username}`);
            isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            logger_1.default.info(`🔒 Password verification result: ${isValidPassword ? 'VALID' : 'INVALID'}`);
        }
        catch (error) {
            logger_1.default.error(`❌ Bcrypt comparison error for user: ${username}`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                username,
                ip: clientIP
            });
            isValidPassword = false;
        }
        if (!isValidPassword) {
            logger_1.default.warn(`❌ Login failed: Invalid password`, {
                username,
                ip: clientIP,
                origin,
                duration: Date.now() - startTime
            });
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        if (!process.env.JWT_SECRET) {
            logger_1.default.error(`❌ JWT_SECRET not configured`);
            return res.status(500).json({
                error: 'Server configuration error',
                code: 'JWT_SECRET_MISSING'
            });
        }
        logger_1.default.info(`🎫 Generating JWT token for user: ${username}`);
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        const responseData = {
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.username,
                email: `${user.username}@callmemobiles.com`
            }
        };
        logger_1.default.info(`✅ Login successful`, {
            username,
            userId: user.id,
            role: user.role,
            ip: clientIP,
            origin,
            duration: Date.now() - startTime,
            tokenGenerated: !!token
        });
        res.json(responseData);
    })().catch(error => {
        logger_1.default.error(`❌ Login endpoint error`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            ip: req.ip,
            origin: req.headers.origin,
            userAgent: req.headers['user-agent']
        });
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    });
});
router.post('/register', (req, res) => {
    (async () => {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const existingUser = await storage_js_1.storage.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        const newUser = await storage_js_1.storage.createUser({ username, password, role });
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                name: newUser.username,
                email: `${newUser.username}@callmemobiles.com`
            }
        });
    })().catch(error => {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
});
router.get('/me', requireAuth, (req, res) => {
    (async () => {
        const userId = req.user.id;
        const user = await storage_js_1.storage.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.username,
                email: `${user.username}@callmemobiles.com`
            }
        });
    })().catch(error => {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
});
exports.default = router;
//# sourceMappingURL=auth-routes.js.map