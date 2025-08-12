import { Pool } from 'pg';
import * as schema from "../shared/schema";
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export declare const sql: (query: string, params?: any[]) => Promise<any[]>;
//# sourceMappingURL=db.d.ts.map