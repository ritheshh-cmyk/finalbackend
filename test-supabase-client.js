require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test query to list users
    const { data: users, error } = await supabase
      .from('users')
      .select('username, role, shop_id')
      .limit(10);
    
    if (error) {
      console.error('Supabase query error:', error);
      return;
    }
    
    console.log('Users found:', users.length);
    console.log('Users:', users);
    
    // Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (adminError) {
      console.error('Admin user query error:', adminError);
    } else {
      console.log('Admin user found:', adminUser);
    }
    
  } catch (error) {
    console.error('Supabase connection error:', error);
  }
}

testSupabaseConnection();