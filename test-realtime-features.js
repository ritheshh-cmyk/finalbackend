// Real-time Features Test
const io = require('socket.io-client');

const BACKEND_URL = 'https://expensoo-app-gu3wg.ondigitalocean.app';
const FRONTEND_URL = 'https://callmemobiles.vercel.app';

async function testRealtimeFeatures() {
  console.log('⚡ TESTING REAL-TIME FEATURES');
  console.log('============================');
  
  // Test WebSocket connection
  console.log('🔌 Testing WebSocket connection...');
  
  const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    timeout: 10000
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    console.log('📡 Socket ID:', socket.id);
    
    // Test real-time events
    socket.emit('test', { message: 'Hello from client' });
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ WebSocket connection failed:', error.message);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected');
  });
  
  // Test specific real-time events
  socket.on('transactionCreated', (data) => {
    console.log('📊 Real-time transaction:', data);
  });
  
  socket.on('dashboardUpdate', (data) => {
    console.log('📈 Real-time dashboard update:', data);
  });
  
  // Keep connection alive for testing
  setTimeout(() => {
    socket.disconnect();
    console.log('🏁 Real-time test completed');
  }, 10000);
}

testRealtimeFeatures().catch(console.error);