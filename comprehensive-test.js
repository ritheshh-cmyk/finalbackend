const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:10000';
let authToken = null;
let testResults = [];

// Test data for creating entities
const testData = {
  user: {
    username: 'testuser_' + Date.now(),
    password: 'testpass123',
    role: 'worker'
  },
  transaction: {
    customerName: 'Test Customer',
    mobileNumber: '1234567890',
    deviceModel: 'iPhone 12',
    repairType: 'Screen Replacement',
    repairCost: 150,
    paymentMethod: 'cash',
    amountGiven: 150,
    changeReturned: 0,
    status: 'Pending'
  },
  supplier: {
    name: 'Test Supplier',
    contactNumber: '9876543210',
    address: '123 Test Street'
  },
  bill: {
    customerName: 'Bill Customer',
    customerPhone: '5555555555',
    billNumber: 'BILL-' + Date.now(),
    totalAmount: 200,
    finalAmount: 200,
    paymentStatus: 'pending'
  },
  inventoryItem: {
    name: 'Test Item',
    description: 'Test inventory item',
    category: 'Parts',
    quantity: 10,
    unitPrice: 25
  },
  notification: {
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    priority: 'medium'
  },
  setting: {
    settingKey: 'test_setting',
    settingValue: 'test_value',
    settingType: 'user',
    description: 'Test setting'
  },
  purchaseOrder: {
    supplierId: 1,
    orderNumber: 'PO-' + Date.now(),
    totalAmount: 500,
    status: 'pending'
  }
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, requireAuth = true) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (requireAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      endpoint,
      method
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      endpoint,
      method
    };
  }
}

// Authentication function
async function authenticate() {
  console.log('🔐 Attempting authentication...');
  
  // Try to login with existing user first
  let loginResult = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'lucky@777'
  }, false);

  if (!loginResult.success) {
    // If login fails, try to register a new user
    console.log('📝 Login failed, attempting registration...');
    const registerResult = await makeRequest('POST', '/api/auth/register', testData.user, false);
    
    if (registerResult.success) {
      console.log('✅ Registration successful, attempting login...');
      loginResult = await makeRequest('POST', '/api/auth/login', {
        username: testData.user.username,
        password: testData.user.password
      }, false);
    }
  }

  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('✅ Authentication successful');
    return true;
  } else {
    console.log('❌ Authentication failed:', loginResult.error);
    return false;
  }
}

// Test function for individual endpoints
async function testEndpoint(method, endpoint, data = null, requireAuth = true, description = '') {
  console.log(`🧪 Testing ${method} ${endpoint} - ${description}`);
  
  const result = await makeRequest(method, endpoint, data, requireAuth);
  testResults.push({
    endpoint,
    method,
    description,
    success: result.success,
    status: result.status,
    error: result.error || null,
    responseData: result.success ? (typeof result.data === 'object' ? JSON.stringify(result.data).substring(0, 200) + '...' : result.data) : null
  });

  const statusIcon = result.success ? '✅' : '❌';
  console.log(`${statusIcon} ${method} ${endpoint}: ${result.status} ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (!result.success) {
    console.log(`   Error: ${JSON.stringify(result.error)}`);
  }

  // Add delay to prevent rate limiting
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return result;
}

// Main test function
async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive API endpoint tests...');
  console.log('=' .repeat(60));

  // Step 1: Authentication
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('\n📋 Testing Core Endpoints...');
  console.log('-'.repeat(40));

  // Test health and version endpoints (no auth required)
  await testEndpoint('GET', '/health', null, false, 'Health check');
  await testEndpoint('GET', '/api/version', null, true, 'API version');

  // Test dashboard and statistics
  await testEndpoint('GET', '/api/dashboard', null, true, 'Dashboard data');
  await testEndpoint('GET', '/api/statistics/today', null, true, 'Today statistics');

  console.log('\n📊 Testing Transaction Endpoints...');
  console.log('-'.repeat(40));

  // Test transactions
  await testEndpoint('GET', '/api/transactions', null, true, 'Get all transactions');
  const createTransactionResult = await testEndpoint('POST', '/api/transactions', testData.transaction, true, 'Create transaction');
  
  if (createTransactionResult.success && createTransactionResult.data?.data?.id) {
    const transactionId = createTransactionResult.data.data.id;
    await testEndpoint('GET', `/api/transactions/${transactionId}`, null, true, 'Get transaction by ID');
    await testEndpoint('PUT', `/api/transactions/${transactionId}`, { status: 'Completed' }, true, 'Update transaction');
  }

  console.log('\n🏪 Testing Supplier Endpoints...');
  console.log('-'.repeat(40));

  // Test suppliers
  await testEndpoint('GET', '/api/suppliers', null, true, 'Get all suppliers');
  const createSupplierResult = await testEndpoint('POST', '/api/suppliers', testData.supplier, true, 'Create supplier');
  
  if (createSupplierResult.success && createSupplierResult.data?.id) {
    const supplierId = createSupplierResult.data.id;
    await testEndpoint('PUT', `/api/suppliers/${supplierId}`, { name: 'Updated Supplier' }, true, 'Update supplier');
  }

  console.log('\n🧾 Testing Bill Endpoints...');
  console.log('-'.repeat(40));

  // Test bills
  await testEndpoint('GET', '/api/bills', null, true, 'Get all bills');
  const createBillResult = await testEndpoint('POST', '/api/bills', testData.bill, true, 'Create bill');
  
  if (createBillResult.success && createBillResult.data?.data?.id) {
    const billId = createBillResult.data.data.id;
    await testEndpoint('PUT', `/api/bills/${billId}`, { paymentStatus: 'paid' }, true, 'Update bill');
  }

  console.log('\n📦 Testing Inventory Endpoints...');
  console.log('-'.repeat(40));

  // Test inventory
  await testEndpoint('GET', '/api/inventory', null, true, 'Get all inventory items');
  await testEndpoint('POST', '/api/inventory', testData.inventoryItem, true, 'Create inventory item');

  console.log('\n🔔 Testing Notification Endpoints...');
  console.log('-'.repeat(40));

  // Test notifications
  await testEndpoint('GET', '/api/notifications', null, true, 'Get all notifications');

  console.log('\n⚙️ Testing Settings Endpoints...');
  console.log('-'.repeat(40));

  // Test settings
  await testEndpoint('GET', '/api/settings', null, true, 'Get all settings');

  console.log('\n📋 Testing Activity Log Endpoints...');
  console.log('-'.repeat(40));

  // Test activity log
  await testEndpoint('GET', '/api/activity-log', null, true, 'Get activity log');

  console.log('\n🛒 Testing Purchase Order Endpoints...');
  console.log('-'.repeat(40));

  // Test purchase orders
  await testEndpoint('GET', '/api/purchase-orders', null, true, 'Get all purchase orders');

  console.log('\n📊 Testing Report Endpoints...');
  console.log('-'.repeat(40));

  // Test reports
  await testEndpoint('GET', '/api/reports', null, true, 'Get all reports');
  await testEndpoint('GET', '/api/reports?dateRange=today', null, true, 'Get today reports');

  console.log('\n🔍 Testing Search Endpoints...');
  console.log('-'.repeat(40));

  // Test search
  await testEndpoint('GET', '/api/search?q=test', null, true, 'Global search');

  console.log('\n📈 Testing Statistics Endpoints...');
  console.log('-'.repeat(40));

  // Test statistics
  await testEndpoint('GET', '/api/stats/today', null, true, 'Today stats');
  await testEndpoint('GET', '/api/stats/week', null, true, 'Week stats');
  await testEndpoint('GET', '/api/stats/month', null, true, 'Month stats');
  await testEndpoint('GET', '/api/stats/year', null, true, 'Year stats');

  // Generate final report
  generateFinalReport();
}

// Generate final test report
function generateFinalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(2);

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Endpoints Tested: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📊 Success Rate: ${successRate}%`);

  if (failedTests > 0) {
    console.log(`\n❌ Failed Endpoints:`);
    testResults.filter(r => !r.success).forEach(result => {
      console.log(`   ${result.method} ${result.endpoint} - Status: ${result.status}`);
      if (result.error) {
        console.log(`      Error: ${JSON.stringify(result.error)}`);
      }
    });
  }

  console.log(`\n✅ Successful Endpoints:`);
  testResults.filter(r => r.success).forEach(result => {
    console.log(`   ${result.method} ${result.endpoint} - Status: ${result.status}`);
  });

  // Save detailed results to file
  const detailedResults = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    },
    results: testResults
  };

  fs.writeFileSync('comprehensive-test-results.json', JSON.stringify(detailedResults, null, 2));
  console.log(`\n💾 Detailed results saved to: comprehensive-test-results.json`);

  console.log('\n🎯 Test Completion Status:');
  if (successRate >= 90) {
    console.log('🎉 EXCELLENT! All endpoints are working properly.');
  } else if (successRate >= 75) {
    console.log('👍 GOOD! Most endpoints are working, minor issues detected.');
  } else if (successRate >= 50) {
    console.log('⚠️  MODERATE! Several endpoints need attention.');
  } else {
    console.log('🚨 CRITICAL! Major issues detected, immediate attention required.');
  }

  console.log('\n' + '='.repeat(60));
}

// Run the tests
runComprehensiveTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});