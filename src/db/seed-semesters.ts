import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No DATABASE_URL found');
  process.exit(1);
}

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding semester...');
  try {
    await db
      .insert(schema.semesters)
      .values({
        name: 'Odd Semester 2026',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.semesters)
      .values({
        name: 'Even Semester 2026',
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-06-30'),
        isActive: false,
      })
      .onConflictDoNothing();

    console.log('Semesters seeded!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

seed();
