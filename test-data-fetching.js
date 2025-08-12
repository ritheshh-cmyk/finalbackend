const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:10000';
let authToken = null;

// Test configuration
const testConfig = {
  username: 'testuser_' + Date.now(),
  password: 'testpass123'
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      endpoint
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'ERROR',
      error: error.response?.data?.message || error.message,
      endpoint
    };
  }
};

// Authentication function
const authenticate = async () => {
  console.log('🔐 Authenticating...');
  
  // Try to register a new user
  const registerResult = await makeRequest('POST', '/api/auth/register', {
    username: testConfig.username,
    password: testConfig.password
  });
  
  if (registerResult.success) {
    console.log('✅ User registered successfully');
  } else {
    console.log('ℹ️ Registration failed (user might exist), trying login...');
  }
  
  // Try to login
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    username: testConfig.username,
    password: testConfig.password
  });
  
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('✅ Authentication successful');
    return true;
  } else {
    console.log('❌ Authentication failed:', loginResult.error);
    return false;
  }
};

// Create test data
const createTestData = async () => {
  console.log('\n📊 Creating test data...');
  
  const testData = {
    suppliers: [
      {
        name: 'Tech Parts Supplier',
        contact: 'John Doe',
        phone: '+1234567890',
        email: 'john@techparts.com',
        address: '123 Tech Street'
      },
      {
        name: 'Mobile Components Ltd',
        contact: 'Jane Smith',
        phone: '+0987654321',
        email: 'jane@mobilecomp.com',
        address: '456 Component Ave'
      }
    ],
    transactions: [
      {
        type: 'repair',
        amount: 150.00,
        description: 'iPhone screen replacement',
        customer_name: 'Alice Johnson',
        customer_phone: '+1111111111'
      },
      {
        type: 'sale',
        amount: 25.00,
        description: 'Phone case sale',
        customer_name: 'Bob Wilson',
        customer_phone: '+2222222222'
      }
    ],
    bills: [
      {
        supplier_id: 1,
        amount: 500.00,
        description: 'Monthly parts order',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    inventory: [
      {
        name: 'iPhone 12 Screen',
        category: 'screens',
        quantity: 10,
        unit_price: 80.00,
        supplier_id: 1
      },
      {
        name: 'Samsung Galaxy S21 Battery',
        category: 'batteries',
        quantity: 5,
        unit_price: 45.00,
        supplier_id: 2
      }
    ]
  };
  
  const results = [];
  
  // Create suppliers
  for (const supplier of testData.suppliers) {
    const result = await makeRequest('POST', '/api/suppliers', supplier);
    results.push({ type: 'supplier', success: result.success, data: result });
  }
  
  // Create transactions
  for (const transaction of testData.transactions) {
    const result = await makeRequest('POST', '/api/transactions', transaction);
    results.push({ type: 'transaction', success: result.success, data: result });
  }
  
  // Create bills
  for (const bill of testData.bills) {
    const result = await makeRequest('POST', '/api/bills', bill);
    results.push({ type: 'bill', success: result.success, data: result });
  }
  
  // Create inventory items
  for (const item of testData.inventory) {
    const result = await makeRequest('POST', '/api/inventory', item);
    results.push({ type: 'inventory', success: result.success, data: result });
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Created ${successCount}/${results.length} test data items`);
  
  return results;
};

// Test all data fetching endpoints
const testDataFetching = async () => {
  console.log('\n🔍 Testing data fetching endpoints...');
  
  const endpoints = [
    // Suppliers
    { method: 'GET', endpoint: '/api/suppliers', description: 'Get all suppliers' },
    
    // Reports
    { method: 'GET', endpoint: '/api/reports', description: 'Get all reports' },
    
    // Business Analytics & Statistics
    { method: 'GET', endpoint: '/api/stats/today', description: 'Today\'s statistics' },
    { method: 'GET', endpoint: '/api/stats/week', description: 'Weekly statistics' },
    { method: 'GET', endpoint: '/api/stats/month', description: 'Monthly statistics' },
    { method: 'GET', endpoint: '/api/stats/year', description: 'Yearly statistics' },
    { method: 'GET', endpoint: '/api/dashboard', description: 'Dashboard data' },
    
    // Core Data
    { method: 'GET', endpoint: '/api/transactions', description: 'Get all transactions' },
    { method: 'GET', endpoint: '/api/bills', description: 'Get all bills' },
    { method: 'GET', endpoint: '/api/inventory', description: 'Get all inventory items' },
    { method: 'GET', endpoint: '/api/notifications', description: 'Get all notifications' },
    { method: 'GET', endpoint: '/api/settings', description: 'Get application settings' },
    
    // Activity & Logs
    { method: 'GET', endpoint: '/api/activity-logs', description: 'Get activity logs' },
    { method: 'GET', endpoint: '/api/expenditures', description: 'Get expenditures' },
    { method: 'GET', endpoint: '/api/purchase-orders', description: 'Get purchase orders' },
    
    // Additional Business Intelligence
    { method: 'GET', endpoint: '/api/supplier-payments', description: 'Get supplier payments' },
    { method: 'GET', endpoint: '/api/grouped-expenditures', description: 'Get grouped expenditures' },
    { method: 'GET', endpoint: '/api/permissions', description: 'Get user permissions' }
  ];
  
  const results = [];
  
  for (const test of endpoints) {
    console.log(`Testing: ${test.description}`);
    const result = await makeRequest(test.method, test.endpoint);
    results.push({
      ...result,
      description: test.description,
      method: test.method
    });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
};

// Generate comprehensive report
const generateReport = (testResults) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_endpoints: testResults.length,
      successful: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      success_rate: Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)
    },
    categories: {
      suppliers: testResults.filter(r => r.endpoint.includes('/suppliers')),
      reports: testResults.filter(r => r.endpoint.includes('/reports')),
      statistics: testResults.filter(r => r.endpoint.includes('/stats') || r.endpoint.includes('/dashboard')),
      core_data: testResults.filter(r => 
        r.endpoint.includes('/transactions') || 
        r.endpoint.includes('/bills') || 
        r.endpoint.includes('/inventory')
      ),
      business_intelligence: testResults.filter(r => 
        r.endpoint.includes('/activity-logs') || 
        r.endpoint.includes('/expenditures') || 
        r.endpoint.includes('/purchase-orders') ||
        r.endpoint.includes('/supplier-payments') ||
        r.endpoint.includes('/grouped-expenditures')
      ),
      system: testResults.filter(r => 
        r.endpoint.includes('/notifications') || 
        r.endpoint.includes('/settings') || 
        r.endpoint.includes('/permissions')
      )
    },
    detailed_results: testResults
  };
  
  return report;
};

// Main test function
const runDataFetchingTests = async () => {
  console.log('🚀 Starting comprehensive data fetching tests...');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    // Step 2: Create test data
    await createTestData();
    
    // Step 3: Test all data fetching endpoints
    const testResults = await testDataFetching();
    
    // Step 4: Generate report
    const report = generateReport(testResults);
    
    // Step 5: Display results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Endpoints Tested: ${report.summary.total_endpoints}`);
    console.log(`Successful: ${report.summary.successful}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.success_rate}%`);
    
    console.log('\n📋 CATEGORY BREAKDOWN:');
    Object.entries(report.categories).forEach(([category, results]) => {
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
      console.log(`  ${category.toUpperCase()}: ${successful}/${total} (${rate}%)`);
    });
    
    console.log('\n🔍 DETAILED RESULTS:');
    testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const statusCode = result.status;
      console.log(`  ${status} ${result.method} ${result.endpoint} - ${statusCode} - ${result.description}`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    // Save detailed report to file
    fs.writeFileSync(
      'data-fetching-test-results.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Detailed results saved to: data-fetching-test-results.json');
    console.log('\n🎉 Data fetching tests completed!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
};

// Run the tests
runDataFetchingTests();