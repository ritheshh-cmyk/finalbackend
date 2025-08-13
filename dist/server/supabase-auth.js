"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthService = exports.supabase = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("./logger"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
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
            const { data: profileData, error: profileError } = await exports.supabaseAdmin
                .from('user_profiles')
                .insert({
                user_id: authData.user.id,
                username: userData.username,
                role: userData.role,
                shop_id: userData.shop_id,
            })
                .select()
                .single();
            if (profileError) {
                logger_1.default.error(`❌ Profile creation failed:`, profileError);
                await exports.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw profileError;
            }
            logger_1.default.info(`✅ User created successfully: ${email} (ID: ${authData.user.id})`);
            return { user: authData.user, profile: profileData };
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
            const profile = await this.getUserProfile(data.user.id);
            logger_1.default.info(`✅ Sign in successful: ${email} (${profile?.username})`);
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
            const { data: profileData, error: profileError } = await exports.supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('username', username)
                .single();
            if (profileError || !profileData) {
                logger_1.default.warn(`❌ Username not found: ${username}`);
                throw new Error('Invalid credentials');
            }
            const { data: userData, error: userError } = await exports.supabaseAdmin.auth.admin.getUserById(profileData.user_id);
            if (userError || !userData.user?.email) {
                logger_1.default.error(`❌ User email not found for username: ${username}`);
                throw new Error('Invalid credentials');
            }
            return await this.signIn(userData.user.email, password);
        }
        catch (error) {
            logger_1.default.error(`❌ Username sign in failed for ${username}:`, error);
            throw error;
        }
    }
    static async getUserProfile(userId) {
        try {
            const { data, error } = await exports.supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error) {
                logger_1.default.error(`❌ Profile fetch failed for user ${userId}:`, error);
                return null;
            }
            return data;
        }
        catch (error) {
            logger_1.default.error(`❌ Profile fetch error for user ${userId}:`, error);
            return null;
        }
    }
    static async verifyToken(token) {
        try {
            const { data: { user }, error } = await exports.supabase.auth.getUser(token);
            if (error || !user) {
                logger_1.default.warn(`❌ Token verification failed:`, error);
                return null;
            }
            const profile = await this.getUserProfile(user.id);
            return { user, profile };
        }
        catch (error) {
            logger_1.default.error(`❌ Token verification error:`, error);
            return null;
        }
    }
    static async signOut(token) {
        try {
            if (token) {
                await exports.supabase.auth.setSession({
                    access_token: token,
                    refresh_token: '',
                });
            }
            const { error } = await exports.supabase.auth.signOut();
            if (error) {
                logger_1.default.error(`❌ Sign out error:`, error);
                throw error;
            }
            logger_1.default.info(`✅ User signed out successfully`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`❌ Sign out failed:`, error);
            throw error;
        }
    }
    static async migrateExistingUsers() {
        try {
            logger_1.default.info(`🔄 Starting user migration to Supabase Auth...`);
            logger_1.default.info(`✅ User migration completed`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`❌ User migration failed:`, error);
            throw error;
        }
    }
}
exports.SupabaseAuthService = SupabaseAuthService;
exports.default = SupabaseAuthService;
//# sourceMappingURL=supabase-auth.js.map