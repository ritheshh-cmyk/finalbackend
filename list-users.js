import 'dotenv/config';
import { sql } from './dist/lib/database.js';

console.log('Connecting to database...');
(async () => {
  try {
    const users = await sql('SELECT id, username, role FROM users', []);
    if (!users || users.length === 0) {
      console.log('No users found.');
    } else {
      console.log('Users:', users);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
  }
  process.exit(0);
})();