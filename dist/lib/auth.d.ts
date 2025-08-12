import type { User } from '../shared/types.js';
export interface AuthRequest extends Request {
    user?: User;
}
export declare function authenticateToken(token: string): Promise<User | null>;
export declare function generateToken(user: User): string;
export declare const requireAuth: (req: Request) => Promise<User>;
export declare const requireAdmin: (req: Request) => Promise<User>;
//# sourceMappingURL=auth.d.ts.map