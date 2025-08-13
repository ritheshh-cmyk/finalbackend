"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireNotDemo = requireNotDemo;
exports.optionalAuth = optionalAuth;
const supabase_auth_1 = __importDefault(require("./supabase-auth"));
const logger_1 = __importDefault(require("./logger"));
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    supabase_auth_1.default.verifyToken(token)
        .then((result) => {
        if (!result || !result.user || !result.profile) {
            logger_1.default.warn(`❌ Invalid token provided`);
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = {
            id: result.user.id,
            email: result.user.email || '',
            username: result.profile.username,
            role: result.profile.role,
            shop_id: result.profile.shop_id,
        };
        req.supabaseUser = result.user;
        logger_1.default.info(`✅ Authenticated user: ${req.user.username} (${req.user.role})`);
        next();
    })
        .catch((error) => {
        logger_1.default.error(`❌ Authentication error:`, error);
        return res.status(401).json({ error: 'Authentication failed' });
    });
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            logger_1.default.warn(`❌ Access denied: User ${req.user.username} (${req.user.role}) tried to access ${roles.join('/')}-only endpoint`);
            return res.status(403).json({
                success: false,
                error: 'Forbidden - Insufficient permissions',
                requiredRoles: roles,
                userRole: req.user.role
            });
        }
        logger_1.default.info(`✅ Role check passed: ${req.user.username} has role ${req.user.role}`);
        next();
    };
}
function requireNotDemo(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'demo') {
        logger_1.default.warn(`❌ Demo user ${req.user.username} attempted to modify data`);
        return res.status(403).json({ error: 'Demo users cannot modify data' });
    }
    next();
}
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    supabase_auth_1.default.verifyToken(token)
        .then((result) => {
        if (result && result.user && result.profile) {
            req.user = {
                id: result.user.id,
                email: result.user.email || '',
                username: result.profile.username,
                role: result.profile.role,
                shop_id: result.profile.shop_id,
            };
            req.supabaseUser = result.user;
            logger_1.default.info(`✅ Optional auth: User ${req.user.username} identified`);
        }
        next();
    })
        .catch((error) => {
        logger_1.default.warn(`⚠️ Optional auth failed, continuing without user:`, error);
        next();
    });
}
//# sourceMappingURL=supabase-auth-middleware.js.map