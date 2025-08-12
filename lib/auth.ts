import { storage } from '../server/storage.js';
import jwt from 'jsonwebtoken';
import type { User } from '../shared/types.js';

export interface AuthRequest extends Request {
  user?: User;
}

export async function authenticateToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const user = await storage.getUserById(decoded.id);
    if (!user) return null;
    // Ensure role and createdAt are present and match User type
    return {
      id: user.id,
      username: user.username,
      role: (user as any).role || 'user',
      createdAt: (user as any).createdAt || new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
}

export const requireAuth = async (req: Request): Promise<User> => {
  const user = await authenticateToken(req.headers.get('authorization') || '');
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};

export const requireAdmin = async (req: Request): Promise<User> => {
  const user = await requireAuth(req);
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
};