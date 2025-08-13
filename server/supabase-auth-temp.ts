import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import logger from './logger';

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper functions for user management (temporary version using metadata only)
export class SupabaseAuthService {
  
  /**
   * Sign up a new user with email/password and store metadata
   */
  static async signUp(email: string, password: string, userData: { username: string; role: string; shop_id?: number }) {
    try {
      logger.info(`🔐 Creating new user: ${email} (${userData.username})`);
      
      // Create user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for admin created users
        user_metadata: {
          username: userData.username,
          role: userData.role,
          shop_id: userData.shop_id,
        }
      });

      if (authError) {
        logger.error(`❌ Auth user creation failed:`, authError);
        throw authError;
      }

      logger.info(`✅ User created successfully: ${email} (ID: ${authData.user.id})`);
      return { 
        user: authData.user, 
        profile: {
          user_id: authData.user.id,
          username: userData.username,
          role: userData.role,
          shop_id: userData.shop_id
        }
      };
      
    } catch (error) {
      logger.error(`❌ User signup failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Sign in user with email/password
   */
  static async signIn(email: string, password: string) {
    try {
      logger.info(`🔐 Signing in user: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error(`❌ Sign in failed for ${email}:`, error);
        throw error;
      }

      // Create profile from user metadata
      const profile = {
        user_id: data.user.id,
        username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
        role: data.user.user_metadata?.role || 'worker',
        shop_id: data.user.user_metadata?.shop_id || null
      };
      
      logger.info(`✅ Sign in successful: ${email} (${profile.username})`);
      return { user: data.user, session: data.session, profile };
      
    } catch (error) {
      logger.error(`❌ Sign in failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Sign in user with username (convert to email first using metadata)
   */
  static async signInWithUsername(username: string, password: string) {
    try {
      logger.info(`🔐 Signing in user with username: ${username}`);
      
      // Find user by username in metadata
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        logger.error(`❌ Error listing users:`, listError);
        throw new Error('Authentication service error');
      }

      const user = users.users.find((u: any) => u.user_metadata?.username === username);
      
      if (!user || !user.email) {
        logger.warn(`❌ Username not found: ${username}`);
        throw new Error('Invalid credentials');
      }

      // Now sign in with the found email
      return await this.signIn(user.email, password);
      
    } catch (error) {
      logger.error(`❌ Username sign in failed for ${username}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile from metadata (temporary version)
   */
  static async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !data.user) {
        logger.error(`❌ User not found: ${userId}`);
        return null;
      }

      return {
        user_id: userId,
        username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
        role: data.user.user_metadata?.role || 'worker',
        shop_id: data.user.user_metadata?.shop_id || null
      };
      
    } catch (error) {
      logger.error(`❌ Get user profile failed:`, error);
      return null;
    }
  }

  /**
   * Verify JWT token and get user info
   */
  static async verifyToken(token: string) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        logger.warn(`❌ Invalid token`);
        return null;
      }

      const profile = await this.getUserProfile(data.user.id);
      return { user: data.user, profile };
      
    } catch (error) {
      logger.error(`❌ Token verification failed:`, error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string) {
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      
      if (error) {
        logger.error(`❌ Token refresh failed:`, error);
        throw error;
      }

      return data;
      
    } catch (error) {
      logger.error(`❌ Token refresh failed:`, error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  static async signOut(token: string) {
    try {
      // Note: For server-side sign out, we just invalidate on client side
      // Supabase handles token expiration
      logger.info(`🔐 User signed out`);
      return { success: true };
      
    } catch (error) {
      logger.error(`❌ Sign out failed:`, error);
      throw error;
    }
  }
}
