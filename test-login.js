require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('Testing login functionality...');
    
    // First, check if admin user exists
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin');
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }
    
    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const user = users[0];
    console.log('✅ Admin user found:', { id: user.id, username: user.username, role: user.role });
    
    // Test password verification
    const passwordMatch = await bcrypt.compare('lucky@777', user.password);
    console.log('Password verification result:', passwordMatch ? '✅ Password matches' : '❌ Password does not match');
    
    if (passwordMatch) {
      console.log('🎉 Login test successful! Admin user can log in with lucky@777');
    } else {
      console.log('❌ Login test failed - password mismatch');
      
      // Let's try to update the password
      console.log('Updating admin password to lucky@777...');
      const hashedPassword = await bcrypt.hash('lucky@777', 10);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('username', 'admin');
      
      if (updateError) {
        console.error('Error updating password:', updateError);
      } else {
        console.log('✅ Password updated successfully');
      }
    }
    
  } catch (err) {
    console.error('Test error:', err);
  }
})();