const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testUserRetrieval() {
  try {
    console.log('Testing user retrieval...');
    
    // Test direct Supabase query
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (error) {
      console.error('Supabase query error:', error);
      return;
    }
    
    console.log('User found:', users);
    console.log('Password field:', users.password);
    console.log('Password type:', typeof users.password);
    console.log('Password length:', users.password ? users.password.length : 'undefined');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testUserRetrieval();