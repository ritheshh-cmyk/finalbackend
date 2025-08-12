"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.createTables = exports.sql = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    max: 20,
    idleTimeoutMillis: 30000
});
const sql = async (query, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result.rows;
    }
    finally {
        client.release();
    }
};
exports.sql = sql;
const createTables = async () => {
    console.log('✅ Database initialization skipped - tables already exist in Supabase');
    console.log('✅ Server starting without database connection test');
};
exports.createTables = createTables;
const initializeDatabase = async () => {
    try {
        await (0, exports.createTables)();
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map