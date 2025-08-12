const axios = require('axios');

const BASE_URL = 'http://localhost:10000';
let authToken = null;

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  endpoints: []
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, requiresAuth = true) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (requiresAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 0, 
      error: error.response?.data || error.message 
    };
  }
};

// Test individual endpoint
const testEndpoint = async (name, method, endpoint, data = null, requiresAuth = true) => {
  console.log(`Testing ${method} ${endpoint}...`);
  const result = await makeRequest(method, endpoint, data, requiresAuth);
  
  results.total++;
  const testResult = {
    name,
    method,
    endpoint,
    status: result.status,
    success: result.success,
    error: result.error || null
  };

  if (result.success) {
    results.passed++;
    console.log(`✅ ${name}: PASSED (${result.status})`);
  } else {
    results.failed++;
    console.log(`❌ ${name}: FAILED (${result.status}) - ${JSON.stringify(result.error)}`);
  }

  results.endpoints.push(testResult);
  await wait(500); // Wait 500ms between requests to avoid rate limiting
  return result;
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting endpoint tests...\n');

  // Test health endpoint (no auth required)
  await testEndpoint('Health Check', 'GET', '/health', null, false);

  // Test auth endpoints (no auth required)
  console.log('\n🔐 Testing authentication...');
  
  // Try to login with existing user first
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    username: 'testuser',
    password: 'password123'
  }, false);

  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('✅ Login successful with existing user');
  } else {
    console.log('❌ Login failed, trying to register new user...');
    
    // Register new user
    const registerResult = await testEndpoint('Auth Register', 'POST', '/api/auth/register', {
      username: 'testuser2',
      password: 'password123'
    }, false);
    
    if (registerResult.success) {
      // Try to login with new user
      await wait(1000);
      const newLoginResult = await makeRequest('POST', '/api/auth/login', {
        username: 'testuser2',
        password: 'password123'
      }, false);
      
      if (newLoginResult.success && newLoginResult.data.token) {
        authToken = newLoginResult.data.token;
        console.log('✅ Login successful with new user');
      } else {
        console.log('❌ Login failed even after registration');
        console.log('Login error:', newLoginResult.error);
      }
    }
  }

  if (!authToken) {
    console.log('❌ No authentication token available, testing public endpoints only');
  }

  // Test key authenticated endpoints with delays
  console.log('\n📊 Testing key endpoints...');
  
  await testEndpoint('Version', 'GET', '/api/version');
  await testEndpoint('Dashboard', 'GET', '/api/dashboard');
  await testEndpoint('Bills List', 'GET', '/api/bills');
  await testEndpoint('Transactions List', 'GET', '/api/transactions');
  await testEndpoint('Suppliers List', 'GET', '/api/suppliers');
  await testEndpoint('Inventory List', 'GET', '/api/inventory');
  await testEndpoint('Notifications', 'GET', '/api/notifications');
  await testEndpoint('Settings', 'GET', '/api/settings');
  
  // Test some POST endpoints
  console.log('\n📝 Testing POST endpoints...');
  
  await testEndpoint('Bills Create', 'POST', '/api/bills', {
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    deviceModel: 'iPhone 12',
    issueDescription: 'Screen repair',
    estimatedCost: 150.00,
    status: 'pending'
  });
  
  await testEndpoint('Transaction Create', 'POST', '/api/transactions', {
    customerName: 'Test Customer',
    mobileNumber: '1234567890',
    deviceModel: 'iPhone 12',
    repairType: 'Screen Replacement',
    repairCost: 150.00,
    amountGiven: 150.00,
    changeReturned: 0.00,
    paymentMethod: 'cash',
    freeGlassInstallation: false,
    status: 'Pending',
    requiresInventory: false
  });
  
  await testEndpoint('Supplier Create', 'POST', '/api/suppliers', {
    name: 'Test Supplier',
    contactNumber: '1234567890',
    address: '123 Test St'
  });
  
  // Print final results
  console.log('\n' + '='.repeat(50));
  console.log('📋 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Endpoints Tested: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  console.log('\n📝 Detailed Results:');
  results.endpoints.forEach(endpoint => {
    const status = endpoint.success ? '✅' : '❌';
    console.log(`${status} ${endpoint.method} ${endpoint.endpoint} (${endpoint.status})`);
    if (!endpoint.success && endpoint.error) {
      console.log(`   Error: ${JSON.stringify(endpoint.error)}`);
    }
  });
  
  // Generate summary report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: ((results.passed / results.total) * 100).toFixed(1) + '%',
      authenticationWorking: !!authToken
    },
    endpoints: results.endpoints
  };
  
  console.log('\n💾 Saving detailed report to endpoint-test-results.json');
  require('fs').writeFileSync('endpoint-test-results.json', JSON.stringify(report, null, 2));
  
  console.log('\n🎯 Test completed!');
  
  if (authToken) {
    console.log('✅ Authentication is working properly');
  } else {
    console.log('❌ Authentication needs to be fixed');
  }
};

// Run the tests
runTests().catch(console.error);