import express from 'express';
import { Request, Response, NextFunction } from 'express';
export declare function requireAuth(req: Request, res: Response, next: NextFunction): express.Response<any, Record<string, any>>;
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => express.Response<any, Record<string, any>>;
export declare function requireNotDemo(req: Request, res: Response, next: NextFunction): express.Response<any, Record<string, any>>;
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=auth-routes.d.ts.map