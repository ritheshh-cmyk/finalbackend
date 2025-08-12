const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testCredentials() {
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
    // Get admin/owner users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, password')
      .in('role', ['admin', 'owner'])
      .order('id');
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('Testing credentials for admin/owner users...');
    
    // Common passwords to test
    const testPasswords = [
      'password',
      'admin', 
      'admin123',
      'finalone123',
      '123456',
      'rithesh',
      'rajashekar',
      'demo',
      'test',
      'password123',
      '12345678'
    ];
    
    for (const user of users) {
      console.log(`\nTesting user: ${user.username} (${user.role})`);
      
      for (const testPass of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPass, user.password);
          if (isValid) {
            console.log(`✅ FOUND: Username: ${user.username}, Password: ${testPass}`);
            
            // Test the login endpoint
            console.log('Testing login endpoint...');
            const response = await fetch('http://localhost:10000/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                username: user.username,
                password: testPass
              })
            });
            
            const result = await response.text();
            console.log(`Login response: ${response.status} - ${result}`);
            break;
          }
        } catch (err) {
          // Continue testing
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCredentials();