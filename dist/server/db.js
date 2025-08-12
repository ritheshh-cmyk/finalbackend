"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.db = exports.pool = void 0;
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("../shared/schema"));
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    },
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});
exports.pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
});
exports.pool.on('connect', (client) => {
    console.log('✅ Database connection established');
    client.on('error', (err) => {
        console.error('❌ Client connection error:', err.message);
    });
});
exports.pool.on('remove', (client) => {
    console.log('🔌 Database connection removed from pool');
});
exports.pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection test failed:', err.message);
        console.log('⚠️ Continuing without database connection test...');
    }
    else {
        console.log('✅ Database connection test successful');
    }
});
process.on('unhandledRejection', (reason, promise) => {
    if (reason && typeof reason === 'object' && 'code' in reason) {
        const error = reason;
        if (error.code === 'XX000' || error.message?.includes('db_termination')) {
            console.error('🔄 Database connection terminated, but continuing...');
            return;
        }
    }
    console.error('❌ Unhandled rejection:', reason);
});
process.on('uncaughtException', (error) => {
    if (error.message?.includes('db_termination') || error.message?.includes('XX000')) {
        console.error('🔄 Database connection error caught, continuing...');
        return;
    }
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool, { schema });
const sql = async (query, params) => {
    const result = await exports.pool.query(query, params);
    return result.rows;
};
exports.sql = sql;
//# sourceMappingURL=db.js.map