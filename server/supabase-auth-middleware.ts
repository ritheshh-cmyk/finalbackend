import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService } from './supabase-auth-temp';
import logger from './logger';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: string;
        shop_id?: number;
      };
      supabaseUser?: any;
    }
  }
}

/**
 * Middleware to require authentication using Supabase Auth
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // Verify token with Supabase
  SupabaseAuthService.verifyToken(token)
    .then((result) => {
      if (!result || !result.user || !result.profile) {
        logger.warn(`❌ Invalid token provided`);
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Attach user data to request
      req.user = {
        id: result.user.id,
        email: result.user.email || '',
        username: result.profile.username,
        role: result.profile.role,
        shop_id: result.profile.shop_id,
      };
      req.supabaseUser = result.user;

      logger.info(`✅ Authenticated user: ${req.user.username} (${req.user.role})`);
      next();
    })
    .catch((error) => {
      logger.error(`❌ Authentication error:`, error);
      return res.status(401).json({ error: 'Authentication failed' });
    });
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`❌ Access denied: User ${req.user.username} (${req.user.role}) tried to access ${roles.join('/')}-only endpoint`);
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden - Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    logger.info(`✅ Role check passed: ${req.user.username} has role ${req.user.role}`);
    next();
  };
}

/**
 * Middleware to block demo users from modifying data
 */
export function requireNotDemo(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'demo') {
    logger.warn(`❌ Demo user ${req.user.username} attempted to modify data`);
    return res.status(403).json({ error: 'Demo users cannot modify data' });
  }

  next();
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user data
    return next();
  }

  const token = authHeader.split(' ')[1];

  // Try to verify token, but don't fail if invalid
  SupabaseAuthService.verifyToken(token)
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
        logger.info(`✅ Optional auth: User ${req.user.username} identified`);
      }
      next();
    })
    .catch((error) => {
      logger.warn(`⚠️ Optional auth failed, continuing without user:`, error);
      next();
    });
}
