require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testSupabaseLogin() {
    try {
        console.log('🧪 Testing username to email lookup...');
        
        // List all users and find one by username in metadata
        const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
            console.error('❌ Error listing users:', error);
            return;
        }
        
        console.log(`📋 Found ${users.users.length} users:`);
        
        // Find a user with username metadata
        for (const user of users.users) {
            const username = user.user_metadata?.username;
            const role = user.user_metadata?.role;
            
            if (username) {
                console.log(`👤 User: ${user.email} | Username: ${username} | Role: ${role}`);
                
                if (username === 'owner') {
                    console.log(`\n🎯 Found target user: ${username}`);
                    console.log(`   Email: ${user.email}`);
                    console.log(`   ID: ${user.id}`);
                    console.log(`   Metadata:`, user.user_metadata);
                    
                    // Test sign in with email directly
                    console.log('\n🔑 Testing sign in with email...');
                    const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
                    
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: user.email,
                        password: 'owner123'
                    });
                    
                    if (signInError) {
                        console.error('❌ Sign in failed:', signInError);
                    } else {
                        console.log('✅ Sign in successful!');
                        console.log('   Access Token:', signInData.session.access_token.substring(0, 50) + '...');
                        console.log('   User ID:', signInData.user.id);
                    }
                    
                    break;
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSupabaseLogin();
