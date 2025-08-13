require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Regular client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDefaultUsers() {
    try {
        console.log('🚀 Creating default users in Supabase Auth...');
        
        const defaultUsers = [
            {
                email: 'admin@example.com',
                password: 'admin123',
                username: 'admin',
                role: 'admin'
            },
            {
                email: 'owner@example.com', 
                password: 'owner123',
                username: 'owner',
                role: 'owner'
            },
            {
                email: 'worker@example.com',
                password: 'worker123', 
                username: 'worker',
                role: 'worker'
            }
        ];
        
        for (const user of defaultUsers) {
            console.log(`\n👤 Creating user: ${user.username} (${user.role})`);
            
            try {
                // Create user with admin client
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: user.email,
                    password: user.password,
                    email_confirm: true,
                    user_metadata: {
                        username: user.username,
                        role: user.role
                    }
                });
                
                if (authError) {
                    if (authError.message.includes('already registered')) {
                        console.log(`⚠️  User ${user.username} already exists, skipping...`);
                        continue;
                    } else {
                        console.error(`❌ Error creating auth user ${user.username}:`, authError);
                        continue;
                    }
                }
                
                console.log(`✅ Created auth user: ${user.username} (ID: ${authData.user.id})`);
                
            } catch (error) {
                console.error(`❌ Exception creating user ${user.username}:`, error.message);
            }
        }
        
        console.log('\n🎉 Default users creation completed!');
        
        // Test if we can list users
        console.log('\n🔍 Verifying users...');
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error listing users:', listError);
        } else {
            console.log(`✅ Found ${users.users.length} users in Supabase Auth:`);
            users.users.forEach(user => {
                const username = user.user_metadata?.username || 'N/A';
                const role = user.user_metadata?.role || 'N/A';
                console.log(`   - ${user.email} | ${username} | ${role}`);
            });
        }
        
    } catch (error) {
        console.error('❌ User creation failed:', error);
        process.exit(1);
    }
}

createDefaultUsers();
