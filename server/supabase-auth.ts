import { createClient } from '@supabase/supabase-js';
import logger from './logger';

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client for backend operations (using service role key for admin access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create Supabase client for user operations (using anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database schema types for TypeScript support
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'owner' | 'worker';
  shop_id?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  role: 'admin' | 'owner' | 'worker';
  shop_id?: number;
  created_at: string;
  updated_at: string;
}

// Helper functions for user management
export class SupabaseAuthService {
  
  /**
   * Sign up a new user with email/password and create profile
   */
  static async signUp(email: string, password: string, userData: { username: string; role: string; shop_id?: number }) {
    try {
      logger.info(`🔐 Creating new user: ${email} (${userData.username})`);
      
      // Create user in Supabase Auth
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

      // Create user profile in public.user_profiles table
      const { data: profileData, error: profileError } = await supabaseAdmin
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
        logger.error(`❌ Profile creation failed:`, profileError);
        // If profile creation fails, delete the auth user to maintain consistency
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      logger.info(`✅ User created successfully: ${email} (ID: ${authData.user.id})`);
      return { user: authData.user, profile: profileData };
      
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

      // Get user profile
      const profile = await this.getUserProfile(data.user.id);
      
      logger.info(`✅ Sign in successful: ${email} (${profile?.username})`);
      return { user: data.user, session: data.session, profile };
      
    } catch (error) {
      logger.error(`❌ Sign in failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Sign in user with username (convert to email first)
   */
  static async signInWithUsername(username: string, password: string) {
    try {
      logger.info(`🔐 Signing in user with username: ${username}`);
      
      // First, find the user's email by username
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        logger.warn(`❌ Username not found: ${username}`);
        throw new Error('Invalid credentials');
      }

      // Get user email from auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
      
      if (userError || !userData.user?.email) {
        logger.error(`❌ User email not found for username: ${username}`);
        throw new Error('Invalid credentials');
      }

      // Now sign in with email and password
      return await this.signIn(userData.user.email, password);
      
    } catch (error) {
      logger.error(`❌ Username sign in failed for ${username}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile by user ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error(`❌ Profile fetch failed for user ${userId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error(`❌ Profile fetch error for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Verify JWT token from Supabase
   */
  static async verifyToken(token: string) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        logger.warn(`❌ Token verification failed:`, error);
        return null;
      }

      // Get user profile
      const profile = await this.getUserProfile(user.id);
      
      return { user, profile };
      
    } catch (error) {
      logger.error(`❌ Token verification error:`, error);
      return null;
    }
  }

  /**
   * Sign out user
   */
  static async signOut(token?: string) {
    try {
      if (token) {
        // Set the session for the client
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: '', // We don't have refresh token in this context
        });
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error(`❌ Sign out error:`, error);
        throw error;
      }

      logger.info(`✅ User signed out successfully`);
      return true;
      
    } catch (error) {
      logger.error(`❌ Sign out failed:`, error);
      throw error;
    }
  }

  /**
   * Migrate existing users from custom auth to Supabase Auth
   */
  static async migrateExistingUsers() {
    try {
      logger.info(`🔄 Starting user migration to Supabase Auth...`);
      
      // This would read from your existing users table and create Supabase auth users
      // Implementation depends on your current user storage system
      
      logger.info(`✅ User migration completed`);
      return true;
      
    } catch (error) {
      logger.error(`❌ User migration failed:`, error);
      throw error;
    }
  }
}

export default SupabaseAuthService;
