const axios = require('axios');

const BASE_URL = 'http://localhost:10000';
let authToken = null;

async function authenticate() {
  const timestamp = Date.now();
  const testUsername = `testuser_${timestamp}`;
  const testPassword = 'testpass123';
  
  console.log(`Attempting to register user: ${testUsername}`);
  
  try {
    // Register a new user with unique username
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: testUsername,
      password: testPassword
    });
    
    console.log('Registration response status:', registerResponse.status);
    console.log('Registration response data:', registerResponse.data);
    
    if (registerResponse.data.token) {
      authToken = registerResponse.data.token;
      console.log(`✅ Registration successful for user: ${testUsername}`);
      return true;
    } else {
      console.log('❌ No token in registration response');
      return false;
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

async function testTransactionEndpoints() {
  console.log('\n=== TESTING TRANSACTION ENDPOINTS ===\n');
  
  if (!await authenticate()) {
    console.log('❌ Cannot test endpoints without authentication');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('Using auth token:', authToken.substring(0, 20) + '...');

  let createdTransactionId = null;

  // Test 1: POST /api/transactions (Create a transaction)
  console.log('\n1. Testing POST /api/transactions (Create Transaction)');
  try {
    const transactionData = {
      customerName: 'John Doe',
      mobileNumber: '1234567890',
      deviceModel: 'iPhone 12',
      repairType: 'Screen Replacement',
      repairCost: 150.00,
      paymentMethod: 'cash',
      amountGiven: 150.00,
      changeReturned: 0.00,
      status: 'Pending',
      remarks: 'Test transaction for fetching'
    };
    
    console.log('Sending transaction data:', transactionData);
    
    const createResponse = await axios.post(`${BASE_URL}/api/transactions`, transactionData, { headers });
    
    console.log('Create response status:', createResponse.status);
    console.log('Create response data:', createResponse.data);
    
    if (createResponse.status === 200 || createResponse.status === 201) {
      createdTransactionId = createResponse.data.id;
      console.log('✅ POST /api/transactions - SUCCESS');
      console.log('   Created transaction ID:', createdTransactionId);
    } else {
      console.log('⚠️  POST /api/transactions - Unexpected status:', createResponse.status);
    }
  } catch (error) {
    console.log('❌ POST /api/transactions - FAILED');
    console.log('   Error:', error.response?.status, error.response?.data || error.message);
  }

  // Test 2: GET /api/transactions (Fetch all transactions)
  console.log('\n2. Testing GET /api/transactions (Fetch All Transactions)');
  try {
    const fetchAllResponse = await axios.get(`${BASE_URL}/api/transactions`, { headers });
    
    console.log('Fetch all response status:', fetchAllResponse.status);
    
    if (fetchAllResponse.status === 200) {
      const transactions = fetchAllResponse.data;
      console.log('✅ GET /api/transactions - SUCCESS');
      console.log(`   Found ${Array.isArray(transactions) ? transactions.length : 'unknown number of'} transactions`);
      
      if (Array.isArray(transactions) && transactions.length > 0) {
        console.log('   Sample transaction:', {
          id: transactions[0].id,
          customer_name: transactions[0].customer_name,
          device_model: transactions[0].device_model,
          repair_cost: transactions[0].repair_cost
        });
      }
    } else {
      console.log('⚠️  GET /api/transactions - Unexpected status:', fetchAllResponse.status);
    }
  } catch (error) {
    console.log('❌ GET /api/transactions - FAILED');
    console.log('   Error:', error.response?.status, error.response?.data || error.message);
  }

  // Test 3: GET /api/transactions/:id (Fetch specific transaction)
  if (createdTransactionId) {
    console.log('\n3. Testing GET /api/transactions/:id (Fetch Specific Transaction)');
    try {
      const fetchOneResponse = await axios.get(`${BASE_URL}/api/transactions/${createdTransactionId}`, { headers });
      
      console.log('Fetch one response status:', fetchOneResponse.status);
      
      if (fetchOneResponse.status === 200) {
        const transaction = fetchOneResponse.data;
        console.log('✅ GET /api/transactions/:id - SUCCESS');
        console.log('   Transaction details:', {
          id: transaction.id,
          customer_name: transaction.customer_name,
          device_model: transaction.device_model,
          repair_cost: transaction.repair_cost
        });
      } else {
        console.log('⚠️  GET /api/transactions/:id - Unexpected status:', fetchOneResponse.status);
      }
    } catch (error) {
      console.log('❌ GET /api/transactions/:id - FAILED');
      console.log('   Error:', error.response?.status, error.response?.data || error.message);
    }
  } else {
    console.log('\n3. Skipping GET /api/transactions/:id (No transaction ID available)');
  }

  // Test 4: Try fetching with a non-existent ID
  console.log('\n4. Testing GET /api/transactions/:id with non-existent ID');
  try {
    const fetchNonExistentResponse = await axios.get(`${BASE_URL}/api/transactions/99999`, { headers });
    console.log('⚠️  GET /api/transactions/99999 - Unexpected success:', fetchNonExistentResponse.status);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ GET /api/transactions/99999 - Correctly returned 404 for non-existent transaction');
    } else {
      console.log('❌ GET /api/transactions/99999 - Unexpected error:', error.response?.status, error.response?.data || error.message);
    }
  }

  console.log('\n=== TRANSACTION ENDPOINT TEST SUMMARY ===');
  console.log('Transaction fetching capabilities have been tested.');
  console.log('Check the results above to see if transactions can be fetched successfully.');
}

// Run the tests
testTransactionEndpoints().catch(console.error);