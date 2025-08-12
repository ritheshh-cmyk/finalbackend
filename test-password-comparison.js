const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testPasswordComparison() {
  try {
    console.log('Testing password comparison...');
    
    // Get the admin user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (error) {
      console.error('Supabase query error:', error);
      return;
    }
    
    console.log('User found:', user.username);
    console.log('Stored hash:', user.password);
    
    // Test different passwords
    const testPasswords = ['lucky@777', 'password', 'admin', 'secret'];
    
    for (const testPassword of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`Password '${testPassword}': ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      } catch (error) {
        console.error(`Error testing password '${testPassword}':`, error);
      }
    }
    
    // Also test creating a new hash for 'lucky@777' to see what it should look like
    console.log('\nCreating new hash for "lucky@777":');
    const newHash = await bcrypt.hash('lucky@777', 10);
    console.log('New hash:', newHash);
    const newHashMatch = await bcrypt.compare('lucky@777', newHash);
    console.log('New hash matches "lucky@777":', newHashMatch);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPasswordComparison();