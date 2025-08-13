"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthService = exports.supabaseAdmin = exports.supabase = void 0;
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("./logger"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
class SupabaseAuthService {
    static async signUp(email, password, userData) {
        try {
            logger_1.default.info(`🔐 Creating new user: ${email} (${userData.username})`);
            const { data: authData, error: authError } = await exports.supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    username: userData.username,
                    role: userData.role,
                    shop_id: userData.shop_id,
                }
            });
            if (authError) {
                logger_1.default.error(`❌ Auth user creation failed:`, authError);
                throw authError;
            }
            logger_1.default.info(`✅ User created successfully: ${email} (ID: ${authData.user.id})`);
            return {
                user: authData.user,
                profile: {
                    user_id: authData.user.id,
                    username: userData.username,
                    role: userData.role,
                    shop_id: userData.shop_id
                }
            };
        }
        catch (error) {
            logger_1.default.error(`❌ User signup failed for ${email}:`, error);
            throw error;
        }
    }
    static async signIn(email, password) {
        try {
            logger_1.default.info(`🔐 Signing in user: ${email}`);
            const { data, error } = await exports.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                logger_1.default.error(`❌ Sign in failed for ${email}:`, error);
                throw error;
            }
            const profile = {
                user_id: data.user.id,
                username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                role: data.user.user_metadata?.role || 'worker',
                shop_id: data.user.user_metadata?.shop_id || null
            };
            logger_1.default.info(`✅ Sign in successful: ${email} (${profile.username})`);
            return { user: data.user, session: data.session, profile };
        }
        catch (error) {
            logger_1.default.error(`❌ Sign in failed for ${email}:`, error);
            throw error;
        }
    }
    static async signInWithUsername(username, password) {
        try {
            logger_1.default.info(`🔐 Signing in user with username: ${username}`);
            const { data: users, error: listError } = await exports.supabaseAdmin.auth.admin.listUsers();
            if (listError) {
                logger_1.default.error(`❌ Error listing users:`, listError);
                throw new Error('Authentication service error');
            }
            const user = users.users.find((u) => u.user_metadata?.username === username);
            if (!user || !user.email) {
                logger_1.default.warn(`❌ Username not found: ${username}`);
                throw new Error('Invalid credentials');
            }
            return await this.signIn(user.email, password);
        }
        catch (error) {
            logger_1.default.error(`❌ Username sign in failed for ${username}:`, error);
            throw error;
        }
    }
    static async getUserProfile(userId) {
        try {
            const { data, error } = await exports.supabaseAdmin.auth.admin.getUserById(userId);
            if (error || !data.user) {
                logger_1.default.error(`❌ User not found: ${userId}`);
                return null;
            }
            return {
                user_id: userId,
                username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                role: data.user.user_metadata?.role || 'worker',
                shop_id: data.user.user_metadata?.shop_id || null
            };
        }
        catch (error) {
            logger_1.default.error(`❌ Get user profile failed:`, error);
            return null;
        }
    }
    static async verifyToken(token) {
        try {
            const { data, error } = await exports.supabase.auth.getUser(token);
            if (error || !data.user) {
                logger_1.default.warn(`❌ Invalid token`);
                return null;
            }
            const profile = await this.getUserProfile(data.user.id);
            return { user: data.user, profile };
        }
        catch (error) {
            logger_1.default.error(`❌ Token verification failed:`, error);
            return null;
        }
    }
    static async refreshToken(refreshToken) {
        try {
            const { data, error } = await exports.supabase.auth.refreshSession({ refresh_token: refreshToken });
            if (error) {
                logger_1.default.error(`❌ Token refresh failed:`, error);
                throw error;
            }
            return data;
        }
        catch (error) {
            logger_1.default.error(`❌ Token refresh failed:`, error);
            throw error;
        }
    }
    static async signOut(token) {
        try {
            logger_1.default.info(`🔐 User signed out`);
            return { success: true };
        }
        catch (error) {
            logger_1.default.error(`❌ Sign out failed:`, error);
            throw error;
        }
    }
}
exports.SupabaseAuthService = SupabaseAuthService;
//# sourceMappingURL=supabase-auth-temp.js.map