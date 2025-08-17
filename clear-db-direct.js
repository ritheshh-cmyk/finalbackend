const { createClient } = require('@supabase/supabase-js');

// Using the working credentials from routes.ts
const supabaseUrl = 'https://apbkjebdyecjbdwrrqrn.supabase.co';
const supabaseServiceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYmtqZWJkeWVjamJkd3JycXJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTcwMjMwNiwiZXhwIjoyMDUxMjc4MzA2fQ.lCrLB5pEJl7ByA8IkGJJsb5MJHyowlTNkVrDBwdyBGc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearDatabase() {
  try {
    console.log('🗑️ Clearing database...');
    
    // Clear all tables
    const { error: transError } = await supabase
      .from('transactions')
      .delete()
      .gte('id', 0);
    
    if (transError) throw transError;
    console.log('✅ Transactions cleared');

    const { error: expError } = await supabase
      .from('expenditures') 
      .delete()
      .gte('id', 0);
    
    if (expError) throw expError;
    console.log('✅ Expenditures cleared');

    const { error: suppError } = await supabase
      .from('suppliers')
      .delete()
      .gte('id', 0);
    
    if (suppError) throw suppError;
    console.log('✅ Suppliers cleared');

    console.log('\n✅ Database cleared successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearDatabase();
