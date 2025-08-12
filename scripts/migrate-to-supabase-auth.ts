import 'dotenv/config';
import SupabaseAuthService from '../server/supabase-auth';
import logger from '../server/logger';

async function createDefaultUsers() {
  try {
    logger.info('🚀 Starting Supabase Auth migration - creating default users...');

    const defaultUsers = [
      {
        email: 'admin@callmemobiles.com',
        password: 'lucky@777',
        username: 'admin',
        role: 'admin'
      },
      {
        email: 'owner@callmemobiles.com',
        password: 'owner@123',
        username: 'owner',
        role: 'owner'
      },
      {
        email: 'worker@callmemobiles.com',
        password: 'worker@123',
        username: 'worker',
        role: 'worker'
      }
    ];

    for (const userData of defaultUsers) {
      try {
        logger.info(`👤 Creating user: ${userData.username} (${userData.email})`);
        
        const result = await SupabaseAuthService.signUp(
          userData.email,
          userData.password,
          {
            username: userData.username,
            role: userData.role
          }
        );

        logger.info(`✅ User created successfully: ${userData.username} (ID: ${result.user.id})`);

      } catch (error) {
        if (error instanceof Error && error.message.includes('already been registered')) {
          logger.info(`⚠️ User ${userData.username} already exists, skipping...`);
        } else {
          logger.error(`❌ Failed to create user ${userData.username}:`, error);
        }
      }
    }

    logger.info('✅ Default users migration completed!');
    
    // Test login with admin user
    logger.info('🧪 Testing admin login...');
    try {
      const loginResult = await SupabaseAuthService.signInWithUsername('admin', 'lucky@777');
      logger.info(`✅ Admin login test successful! Token: ${loginResult.session.access_token.substring(0, 20)}...`);
      
      // Sign out
      await SupabaseAuthService.signOut(loginResult.session.access_token);
      logger.info('✅ Admin logout test successful!');
      
    } catch (loginError) {
      logger.error('❌ Admin login test failed:', loginError);
    }

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  createDefaultUsers()
    .then(() => {
      logger.info('🎉 Supabase Auth migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { createDefaultUsers };
