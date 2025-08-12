import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET not set in environment' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

// Add this middleware to block demo users from modifying data
export function requireNotDemo(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user && user.role === 'demo') {
    return res.status(403).json({ error: 'Demo users cannot modify data' });
  }
  next();
}

const router = express.Router();

// Enhanced Login endpoint with comprehensive logging
router.post('/login', (req, res) => {
  (async () => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const origin = req.headers.origin;
    
    logger.info(`🔐 Login attempt started`, {
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

    logger.info(`🔍 Looking up user: ${username}`);

    // Get user from storage
    const user = await storage.getUserByUsername(username);
    if (!user) {
      logger.warn(`❌ Login failed: User not found`, {
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

    logger.info(`👤 User found: ${username} (ID: ${user.id}, Role: ${user.role})`);

    // Always use bcrypt to compare password with password field
    let isValidPassword = false;
    try {
      logger.info(`🔒 Verifying password for user: ${username}`);
      isValidPassword = await bcrypt.compare(password, (user as any).password);
      logger.info(`🔒 Password verification result: ${isValidPassword ? 'VALID' : 'INVALID'}`);
    } catch (error) {
      logger.error(`❌ Bcrypt comparison error for user: ${username}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        username,
        ip: clientIP
      });
      isValidPassword = false;
    }

    if (!isValidPassword) {
      logger.warn(`❌ Login failed: Invalid password`, {
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

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      logger.error(`❌ JWT_SECRET not configured`);
      return res.status(500).json({ 
        error: 'Server configuration error',
        code: 'JWT_SECRET_MISSING'
      });
    }

    // Generate JWT token
    logger.info(`🎫 Generating JWT token for user: ${username}`);
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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

    logger.info(`✅ Login successful`, {
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
    logger.error(`❌ Login endpoint error`, {
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

// Register endpoint
router.post('/register', (req, res) => {
  (async () => {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Create new user (storage.createUser will handle password hashing)
    const newUser = await storage.createUser({ username, password, role });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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

// Get current user endpoint
router.get('/me', requireAuth, (req, res) => {
  (async () => {
    const userId = (req as any).user.id;
    const user = await storage.getUserById(userId);
    
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

export default router;