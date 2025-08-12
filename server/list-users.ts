require('dotenv').config();
console.log('Script started');
const { sql } = require('../lib/database');
try {
  console.log('Connecting to database...');
} catch (err) {
  console.error('Error importing sql:', err);
  process.exit(1);
}
(async () => {
  try {
    const users = await sql`SELECT id, username, role FROM users`;
    if (!users || users.length === 0) {
      console.log('No users found.');
    } else {
      console.log('Users:', users);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
  }
  if (process.argv.includes('--fix-roles')) {
    (async () => {
      await sql`UPDATE users SET role = 'owner' WHERE id IN (2,4)`;
      console.log('Roles updated for users 2 and 4 to owner');
      process.exit(0);
    })();
  }
  if (process.argv.includes('--fix-demo-role')) {
    (async () => {
      await sql`UPDATE users SET role = 'demo' WHERE id = 6`;
      console.log('Role updated for user 6 to demo');
      process.exit(0);
    })();
  }
  if (process.argv.includes('--reset-all-passwords')) {
    (async () => {
      const bcrypt = require('bcryptjs');
      const adminHash = await bcrypt.hash('lucky@777', 10);
      const owner1Hash = await bcrypt.hash('raj@9948', 10);
      const owner2Hash = await bcrypt.hash('raj@9948', 10);
      const worker1Hash = await bcrypt.hash('sravan@000', 10);
      const worker2Hash = await bcrypt.hash('sravan@000', 10);
      await sql`UPDATE users SET password_hash = ${adminHash} WHERE username = 'admin'`;
      await sql`UPDATE users SET password_hash = ${owner1Hash} WHERE username = 'rajshekar'`;
      await sql`UPDATE users SET password_hash = ${owner2Hash} WHERE username = 'rajshekar2'`;
      await sql`UPDATE users SET password_hash = ${worker1Hash} WHERE username = 'sravan'`;
      await sql`UPDATE users SET password_hash = ${worker2Hash} WHERE username = 'sravan2'`;
      console.log('Passwords reset for admin, owners, and workers');
      process.exit(0);
    })();
  }
})();