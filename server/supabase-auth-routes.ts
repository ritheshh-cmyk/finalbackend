import express from 'express';
import SupabaseAuthService from './supabase-auth';
import { requireAuth, requireRole, optionalAuth } from './supabase-auth-middleware';
import logger from './logger';

const router = express.Router();

/**
 * Login with username and password (Supabase Auth)
 */
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const origin = req.headers.origin;
  
  try {
    logger.info(`🔐 Supabase login attempt started`, {
      ip: clientIP,
      userAgent,
      origin,
      timestamp: new Date().toISOString()
    });

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      logger.warn(`❌ Login failed: Missing credentials`, {
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

    // Sign in with Supabase Auth using username
    const result = await SupabaseAuthService.signInWithUsername(username, password);

    if (!result.user || !result.session || !result.profile) {
      logger.warn(`❌ Login failed: Invalid credentials`, {
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

    logger.info(`✅ Supabase login successful`, {
      username,
      userId: result.user.id,
      role: result.profile.role,
      ip: clientIP,
      origin,
      duration: Date.now() - startTime
    });

    res.json(responseData);

  } catch (error) {
    logger.error(`❌ Supabase login error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIP,
      origin,
      userAgent,
      duration: Date.now() - startTime
    });

    // Handle specific Supabase errors
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

/**
 * Register new user (Admin only)
 */
router.post('/register', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role, shop_id } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Username, email, password, and role are required' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'owner', 'worker'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, owner, or worker' 
      });
    }

    logger.info(`👤 Admin ${req.user?.username} creating new user: ${username} (${email}) with role: ${role}`);

    // Create user with Supabase Auth
    const result = await SupabaseAuthService.signUp(email, password, {
      username,
      role,
      shop_id: shop_id || null
    });

    logger.info(`✅ User registered successfully: ${username} (ID: ${result.user.id})`);

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

  } catch (error) {
    logger.error(`❌ User registration error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      adminUser: req.user?.username
    });

    // Handle specific Supabase errors
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

/**
 * Refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Refresh session with Supabase
    const { data, error } = await SupabaseAuthService.supabase.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      logger.warn(`❌ Token refresh failed:`, error);
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user profile
    const profile = await SupabaseAuthService.getUserProfile(data.user.id);

    if (!profile) {
      return res.status(404).json({ 
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    logger.info(`✅ Token refreshed for user: ${profile.username}`);

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

  } catch (error) {
    logger.error(`❌ Token refresh error:`, error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * Logout
 */
router.post('/logout', optionalAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    if (token) {
      await SupabaseAuthService.signOut(token);
      logger.info(`✅ User logged out: ${req.user?.username || 'Unknown'}`);
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    logger.error(`❌ Logout error:`, error);
    // Don't fail logout even if there's an error
    res.json({ message: 'Logged out successfully' });
  }
});

/**
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
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

  } catch (error) {
    logger.error(`❌ Get user info error:`, error);
    res.status(500).json({ 
      error: 'Failed to get user info',
      code: 'USER_INFO_ERROR'
    });
  }
});

/**
 * Change password
 */
router.post('/change-password', requireAuth, async (req, res) => {
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

    // First verify current password by attempting to sign in
    if (!req.user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    try {
      await SupabaseAuthService.signIn(req.user.email, current_password);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password with Supabase Admin
    const { error } = await SupabaseAuthService.supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: new_password }
    );

    if (error) {
      logger.error(`❌ Password change failed for user ${req.user.username}:`, error);
      return res.status(500).json({ 
        error: 'Failed to update password',
        code: 'PASSWORD_UPDATE_ERROR'
      });
    }

    logger.info(`✅ Password changed successfully for user: ${req.user.username}`);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error(`❌ Change password error:`, error);
    res.status(500).json({ 
      error: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

export default router;
