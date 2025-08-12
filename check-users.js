const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUsers() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('Checking users in database...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, password')
      .order('id');
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('\nUsers found:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
      console.log(`  Password hash: ${user.password.substring(0, 20)}...`);
    });
    
    // Test password verification
    const bcrypt = require('bcryptjs');
    const adminUser = users.find(u => u.username === 'admin');
    if (adminUser) {
      const isValidPassword = await bcrypt.compare('password', adminUser.password);
      console.log(`\nPassword 'password' is valid for admin: ${isValidPassword}`);
      
      // Test with other common passwords
      const testPasswords = ['admin', 'admin123', 'finalone123'];
      for (const testPass of testPasswords) {
        const isValid = await bcrypt.compare(testPass, adminUser.password);
        console.log(`Password '${testPass}' is valid for admin: ${isValid}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();