const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

// Sample transactions data
const sampleTransactions = [
  {
    customerName: 'John Doe',
    mobileNumber: '9876543210',
    deviceModel: 'iPhone 14',
    repairType: 'Screen Replacement',
    repairCost: 2500,
    paymentMethod: 'cash',
    amountGiven: 2500,
    changeReturned: 0,
    status: 'completed',
    remarks: 'Screen replaced successfully',
    partsCost: '0'
  },
  {
    customerName: 'Jane Smith',
    mobileNumber: '8765432109',
    deviceModel: 'Samsung Galaxy S23',
    repairType: 'Battery Replacement',
    repairCost: 1800,
    paymentMethod: 'upi',
    amountGiven: 1800,
    changeReturned: 0,
    status: 'pending',
    remarks: 'Waiting for battery part',
    partsCost: '150'
  },
  {
    customerName: 'Mike Johnson',
    mobileNumber: '7654321098',
    deviceModel: 'OnePlus 11',
    repairType: 'Charging Port Repair',
    repairCost: 1200,
    paymentMethod: 'card',
    amountGiven: 1200,
    changeReturned: 0,
    status: 'in-progress',
    remarks: 'Repair in progress',
    partsCost: '80'
  },
  {
    customerName: 'Sarah Wilson',
    mobileNumber: '6543210987',
    deviceModel: 'iPhone 13 Pro',
    repairType: 'Camera Repair',
    repairCost: 3200,
    paymentMethod: 'bank-transfer',
    amountGiven: 3200,
    changeReturned: 0,
    status: 'delivered',
    remarks: 'Camera module replaced and tested',
    partsCost: '250'
  },
  {
    customerName: 'David Brown',
    mobileNumber: '5432109876',
    deviceModel: 'Xiaomi 13',
    repairType: 'Water Damage Repair',
    repairCost: 2800,
    paymentMethod: 'cash',
    amountGiven: 3000,
    changeReturned: 200,
    status: 'completed',
    remarks: 'Water damage repaired, all functions working',
    partsCost: '120'
  }
];

async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'rithesh_fixed',
      password: '7989002273'
    });
    
    if (response.data.token) {
      console.log('✅ Authentication successful');
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data || error.message);
  }
  return null;
}

async function addTransactions() {
  console.log('🚀 Starting to add sample transactions via API...');
  
  // First authenticate
  const token = await authenticate();
  if (!token) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  };
  
  let successCount = 0;
  let failCount = 0;
  
  for (const transaction of sampleTransactions) {
    try {
      const response = await axios.post(`${BASE_URL}/api/transactions`, transaction, { headers });
      
      if (response.status === 201) {
        console.log(`✅ Added transaction for ${transaction.customerName}`);
        successCount++;
      } else {
        console.log(`⚠️  Unexpected status for ${transaction.customerName}: ${response.status}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Failed to add transaction for ${transaction.customerName}:`, error.response?.data || error.message);
      failCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  
  // Verify by fetching all transactions
  try {
    const response = await axios.get(`${BASE_URL}/api/transactions`, { headers });
    console.log(`   📋 Total transactions in database: ${response.data.length}`);
  } catch (error) {
    console.log('   ⚠️  Could not verify transaction count');
  }
}

addTransactions().then(() => {
  console.log('🎉 Script completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});