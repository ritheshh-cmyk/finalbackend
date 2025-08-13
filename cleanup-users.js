require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function cleanupUndefinedUsers() {
    try {
        console.log('🧹 Starting cleanup of undefined/legacy users...');
        
        // Get all users
        const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
            console.error('❌ Error listing users:', error);
            return;
        }
        
        console.log(`📋 Found ${users.users.length} total users`);
        
        // Define the users we want to keep (our main accounts)
        const keepUsers = ['admin', 'owner', 'worker'];
        const usersToDelete = [];
        const usersToKeep = [];
        
        // Categorize users
        users.users.forEach(user => {
            const username = user.user_metadata?.username;
            const role = user.user_metadata?.role;
            
            if (keepUsers.includes(username) && keepUsers.includes(role)) {
                usersToKeep.push({
                    email: user.email,
                    username,
                    role,
                    id: user.id
                });
            } else {
                usersToDelete.push({
                    email: user.email,
                    username: username || 'N/A',
                    role: role || 'undefined',
                    id: user.id
                });
            }
        });
        
        console.log('\n📊 User Analysis:');
        console.log(`✅ Users to keep: ${usersToKeep.length}`);
        usersToKeep.forEach(u => {
            console.log(`   - ${u.email} | ${u.username} | ${u.role}`);
        });
        
        console.log(`🗑️ Users to delete: ${usersToDelete.length}`);
        usersToDelete.slice(0, 5).forEach(u => {
            console.log(`   - ${u.email} | ${u.username} | ${u.role}`);
        });
        if (usersToDelete.length > 5) {
            console.log(`   ... and ${usersToDelete.length - 5} more`);
        }
        
        // Ask for confirmation (simulate with timeout)
        console.log('\n⚠️ This will permanently delete the undefined/legacy users.');
        console.log('Starting deletion in 3 seconds...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n🗑️ Starting user deletion...');
        let deletedCount = 0;
        let errorCount = 0;
        
        // Delete users in batches to avoid rate limits
        for (let i = 0; i < usersToDelete.length; i++) {
            const user = usersToDelete[i];
            
            try {
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
                
                if (deleteError) {
                    console.error(`❌ Failed to delete ${user.email}:`, deleteError.message);
                    errorCount++;
                } else {
                    console.log(`✅ Deleted: ${user.email} (${user.username})`);
                    deletedCount++;
                }
                
                // Small delay to avoid rate limits
                if (i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
            } catch (err) {
                console.error(`❌ Exception deleting ${user.email}:`, err.message);
                errorCount++;
            }
        }
        
        console.log('\n🎉 Cleanup completed!');
        console.log(`✅ Successfully deleted: ${deletedCount} users`);
        console.log(`❌ Failed to delete: ${errorCount} users`);
        console.log(`✅ Kept clean accounts: ${usersToKeep.length} users`);
        
        // Verify final state
        console.log('\n🔍 Verifying final user count...');
        const { data: finalUsers, error: finalError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (finalError) {
            console.error('❌ Error verifying final state:', finalError);
        } else {
            console.log(`✅ Final user count: ${finalUsers.users.length}`);
            
            const finalRoleCount = {};
            finalUsers.users.forEach(u => {
                const role = u.user_metadata?.role || 'undefined';
                finalRoleCount[role] = (finalRoleCount[role] || 0) + 1;
            });
            
            Object.entries(finalRoleCount).forEach(([role, count]) => {
                console.log(`   - ${role}: ${count} users`);
            });
        }
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupUndefinedUsers();
