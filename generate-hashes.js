const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('Generating bcrypt hashes...');
  
  const passwords = {
    'owner123': await bcrypt.hash('owner123', 10),
    'worker123': await bcrypt.hash('worker123', 10)
  };
  
  console.log('\nGenerated hashes:');
  console.log(`owner123: ${passwords['owner123']}`);
  console.log(`worker123: ${passwords['worker123']}`);
  
  // Test the hashes
  console.log('\nTesting hashes:');
  console.log(`owner123 hash valid: ${await bcrypt.compare('owner123', passwords['owner123'])}`);
  console.log(`worker123 hash valid: ${await bcrypt.compare('worker123', passwords['worker123'])}`);
}

generateHashes().catch(console.error);