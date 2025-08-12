"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = void 0;
exports.authenticateToken = authenticateToken;
exports.generateToken = generateToken;
const storage_js_1 = require("../server/storage.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function authenticateToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await storage_js_1.storage.getUserById(decoded.id);
        if (!user)
            return null;
        return {
            id: user.id,
            username: user.username,
            role: user.role || 'user',
            createdAt: user.createdAt || new Date().toISOString()
        };
    }
    catch (error) {
        return null;
    }
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
}
const requireAuth = async (req) => {
    const user = await authenticateToken(req.headers.get('authorization') || '');
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req) => {
    const user = await (0, exports.requireAuth)(req);
    if (user.role !== 'admin') {
        throw new Error('Admin access required');
    }
    return user;
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.js.map