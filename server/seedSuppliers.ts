import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { suppliers } from '../shared/schema';
import { sql } from 'drizzle-orm';

const defaultSuppliers = [
  { name: 'Patel' },
  { name: 'Mahalaxmi' },
  { name: 'Rathod' },
  { name: 'Sri' },
  { name: 'Ramdev' },
  { name: 'Hub' },
];

async function seedSuppliers() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  for (const supplier of defaultSuppliers) {
    // Check if supplier already exists
    const existing = await db.select().from(suppliers).where(sql`name = ${supplier.name}`);
    if (existing.length === 0) {
      await db.insert(suppliers).values(supplier);
      console.log(`Inserted supplier: ${supplier.name}`);
    } else {
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