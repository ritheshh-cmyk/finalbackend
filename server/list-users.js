const { sql } = require('./backend/lib/database.js');
(async () => {
  const users = await sql`SELECT id, username, role FROM users`;
  console.log(users);
  process.exit(0);
})();