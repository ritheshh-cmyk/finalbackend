"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_auth_temp_1 = require("./supabase-auth-temp");
const supabase_auth_middleware_1 = require("./supabase-auth-middleware");
const logger_1 = __importDefault(require("./logger"));
const router = express_1.default.Router();
router.post('/login', async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const origin = req.headers.origin;
    try {
        logger_1.default.info(`🔐 Supabase login attempt started`, {
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
        const result = await supabase_auth_temp_1.SupabaseAuthService.signInWithUsername(username, password);
        if (!result.user || !result.session || !result.profile) {
            logger_1.default.warn(`❌ Login failed: Invalid credentials`, {
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
        const responseData = {
            message: 'Login successful',
            token: result.session.access_token,
            user: {
                id: result.user.id,
                username: result.profile.username,
                role: result.profile.role,
                name: result.profile.username,
                email: result.user.email,
                shop_id: result.profile.shop_id
            },
            session: {
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token,
                expires_at: result.session.expires_at,
                expires_in: result.session.expires_in
            }
        };
        logger_1.default.info(`✅ Supabase login successful`, {
            username,
            userId: result.user.id,
            role: result.profile.role,
            ip: clientIP,
            origin,
            duration: Date.now() - startTime
        });
        res.json(responseData);
    }
    catch (error) {
        logger_1.default.error(`❌ Supabase login error`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            ip: clientIP,
            origin,
            userAgent,
            duration: Date.now() - startTime
        });
        if (error instanceof Error) {
            if (error.message.includes('Invalid login credentials')) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }
            if (error.message.includes('Email not confirmed')) {
                return res.status(400).json({
                    error: 'Please confirm your email address',
                    code: 'EMAIL_NOT_CONFIRMED'
                });
            }
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.get('/verify', supabase_auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        res.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email,
                shop_id: user.shop_id
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Token verification error:', error);
        res.status(401).json({
            error: 'Token verification failed',
            code: 'VERIFICATION_FAILED'
        });
    }
});
router.post('/register', supabase_auth_middleware_1.requireAuth, (0, supabase_auth_middleware_1.requireRole)('admin'), async (req, res) => {
    try {
        const { username, email, password, role, shop_id } = req.body;
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                error: 'Username, email, password, and role are required'
            });
        }
        const validRoles = ['admin', 'owner', 'worker'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                error: 'Invalid role. Must be admin, owner, or worker'
            });
        }
        logger_1.default.info(`👤 Admin ${req.user?.username} creating new user: ${username} (${email}) with role: ${role}`);
        const result = await supabase_auth_temp_1.SupabaseAuthService.signUp(email, password, {
            username,
            role,
            shop_id: shop_id || null
        });
        logger_1.default.info(`✅ User registered successfully: ${username} (ID: ${result.user.id})`);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result.user.id,
                username: result.profile.username,
                email: result.user.email,
                role: result.profile.role,
                shop_id: result.profile.shop_id,
                created_at: result.user.created_at
            }
        });
    }
    catch (error) {
        logger_1.default.error(`❌ User registration error`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            adminUser: req.user?.username
        });
        if (error instanceof Error) {
            if (error.message.includes('already been registered')) {
                return res.status(409).json({
                    error: 'User already exists',
                    code: 'USER_EXISTS'
                });
            }
            if (error.message.includes('Password should be at least')) {
                return res.status(400).json({
                    error: 'Password must be at least 6 characters long',
                    code: 'WEAK_PASSWORD'
                });
            }
            if (error.message.includes('duplicate key value')) {
                return res.status(409).json({
                    error: 'Username already exists',
                    code: 'USERNAME_EXISTS'
                });
            }
        }
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }
        const { data, error } = await supabase_auth_temp_1.supabase.auth.refreshSession({
            refresh_token
        });
        if (error || !data.session) {
            logger_1.default.warn(`❌ Token refresh failed:`, error);
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
        const profile = await supabase_auth_temp_1.SupabaseAuthService.getUserProfile(data.user.id);
        if (!profile) {
            return res.status(404).json({
                error: 'User profile not found',
                code: 'PROFILE_NOT_FOUND'
            });
        }
        logger_1.default.info(`✅ Token refreshed for user: ${profile.username}`);
        res.json({
            message: 'Token refreshed successfully',
            token: data.session.access_token,
            user: {
                id: data.user.id,
                username: profile.username,
                role: profile.role,
                name: profile.username,
                email: data.user.email,
                shop_id: profile.shop_id
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in
            }
        });
    }
    catch (error) {
        logger_1.default.error(`❌ Token refresh error:`, error);
        res.status(500).json({
            error: 'Token refresh failed',
            code: 'REFRESH_ERROR'
        });
    }
});
router.post('/logout', supabase_auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
        if (token) {
            await supabase_auth_temp_1.SupabaseAuthService.signOut(token);
            logger_1.default.info(`✅ User logged out: ${req.user?.username || 'Unknown'}`);
        }
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        logger_1.default.error(`❌ Logout error:`, error);
        res.json({ message: 'Logged out successfully' });
    }
});
router.get('/me', supabase_auth_middleware_1.requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        res.json({
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role,
                name: req.user.username,
                email: req.user.email,
                shop_id: req.user.shop_id
            }
        });
    }
    catch (error) {
        logger_1.default.error(`❌ Get user info error:`, error);
        res.status(500).json({
            error: 'Failed to get user info',
            code: 'USER_INFO_ERROR'
        });
    }
});
router.post('/change-password', supabase_auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }
        if (new_password.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters long'
            });
        }
        if (!req.user?.email) {
            return res.status(400).json({ error: 'User email not found' });
        }
        try {
            await supabase_auth_temp_1.SupabaseAuthService.signIn(req.user.email, current_password);
        }
        catch (error) {
            return res.status(401).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        const { error } = await supabase_auth_temp_1.supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: new_password });
        if (error) {
            logger_1.default.error(`❌ Password change failed for user ${req.user.username}:`, error);
            return res.status(500).json({
                error: 'Failed to update password',
                code: 'PASSWORD_UPDATE_ERROR'
            });
        }
        logger_1.default.info(`✅ Password changed successfully for user: ${req.user.username}`);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        logger_1.default.error(`❌ Change password error:`, error);
        res.status(500).json({
            error: 'Password change failed',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
});
exports.default = router;
//# sourceMappingURL=supabase-auth-routes.js.map