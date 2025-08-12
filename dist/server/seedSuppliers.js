"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const defaultSuppliers = [
    { name: 'Patel' },
    { name: 'Mahalaxmi' },
    { name: 'Rathod' },
    { name: 'Sri' },
    { name: 'Ramdev' },
    { name: 'Hub' },
];
async function seedSuppliers() {
    const client = new pg_1.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const db = (0, node_postgres_1.drizzle)(client);
    for (const supplier of defaultSuppliers) {
        const existing = await db.select().from(schema_1.suppliers).where((0, drizzle_orm_1.sql) `name = ${supplier.name}`);
        if (existing.length === 0) {
            await db.insert(schema_1.suppliers).values(supplier);
            console.log(`Inserted supplier: ${supplier.name}`);
        }
        else {
            console.log(`Supplier already exists: ${supplier.name}`);
        }
    }
    await client.end();
    console.log('Seeding complete.');
}
seedSuppliers().catch((err) => {
    console.error('Error seeding suppliers:', err);
    process.exit(1);
});
//# sourceMappingURL=seedSuppliers.js.map