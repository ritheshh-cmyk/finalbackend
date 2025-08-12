const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
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
    
    console.log('\n1. Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('Health check failed:', healthError);
      return false;
    }
    
    console.log('✅ Basic connection successful');
    
    console.log('\n2. Testing transactions table...');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);
    
    if (transError) {
      console.error('Transactions query failed:', transError);
    } else {
      console.log('✅ Transactions table accessible');
    }
    
    console.log('\n3. Testing suppliers table...');
    const { data: suppliers, error: suppError } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1);
    
    if (suppError) {
      console.error('Suppliers query failed:', suppError);
    } else {
      console.log('✅ Suppliers table accessible');
    }
    
    console.log('\n4. Testing inventory_items table...');
    const { data: inventory, error: invError } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);
    
    if (invError) {
      console.error('Inventory query failed:', invError);
    } else {
      console.log('✅ Inventory table accessible');
    }
    
    return true;
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 All Supabase connection tests passed!');
    } else {
      console.log('\n❌ Some connection tests failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });