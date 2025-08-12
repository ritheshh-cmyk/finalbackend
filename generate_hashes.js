const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = {
    'admin': 'lucky@777',
    'rithesh': '7989002273',
    'rajashekar': 'raj99481',
    'sravan': 'sravan6565',
    'demo': 'demo123'
  };

  console.log('Generating bcrypt hashes...');
  
  for (const [username, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${username}: ${password} -> ${hash}`);
  }
}

generateHashes().catch(console.error);