// Real-Time Integration for Backend Server
// Add this to your backend/server/routes.ts or main server file

const { RealTimeManager, ServerSentEvents, DatabaseChangeListener } = require('../lib/realtime-manager');

// Initialize real-time components
const realTimeManager = new RealTimeManager();
const serverSentEvents = new ServerSentEvents();

// Real-time enhanced transaction creation endpoint
app.post('/api/transactions/realtime', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    console.log('🔄 Real-time transaction creation by:', user.username);
    
    const {
      customerName,
      mobileNumber,
      deviceModel,
      repairType,
      repairCost,
      paymentMethod,
      amountGiven,
      changeReturned,
      status,
      remarks
    } = req.body;

    // Validate required fields
    if (!customerName || !mobileNumber || !deviceModel || !repairType || !repairCost) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields for real-time transaction' 
      });
    }

    // Calculate real-time metrics
    const amount = parseFloat(amountGiven) || parseFloat(repairCost) || 0;
    const cost = parseFloat(repairCost) || 0;
    const profit = amount - cost;

    // Insert into database
    const { data: newTransaction, error } = await supabase
      .from('transactions')
      .insert([{
        customer_name: customerName,
        mobile_number: mobileNumber,
        device_model: deviceModel,
        repair_type: repairType,
        repair_cost: cost,
        amount_given: amount,
        change_returned: parseFloat(changeReturned) || 0,
        payment_method: paymentMethod || 'Cash',
        status: status || 'Completed',
        remarks: remarks || '',
        profit: profit,
        actual_cost: cost,
        free_glass_installation: false,
        requires_inventory: false,
        parts_cost: '[]',
        created_at: new Date().toISOString()
      }])
      .select(`
        id, 
        customer_name as customerName,
        device_model as deviceModel,
        amount_given as amountGiven,
        repair_cost as repairCost,
        profit,
        status,
        created_at as createdAt
      `)
      .single();

    if (error) {
      console.error('Real-time transaction creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create real-time transaction',
        details: error.message
      });
    }

    // Real-time notification to all connected clients
    realTimeManager.notifyTransactionCreated(newTransaction);
    serverSentEvents.broadcast('transaction_created', newTransaction);
    
    // Update dashboard metrics in real-time
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount_given, repair_cost, profit, status');
    
    if (allTransactions) {
      const realTimeMetrics = {
        totalRevenue: allTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0),
        totalProfit: allTransactions.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0),
        totalTransactions: allTransactions.length,
        completedCount: allTransactions.filter(tx => 
          tx.status && tx.status.toLowerCase().includes('completed')
        ).length,
        lastUpdated: new Date().toISOString()
      };
      
      realTimeManager.notifyDashboardUpdate(realTimeMetrics);
      serverSentEvents.broadcast('dashboard_update', realTimeMetrics);
    }

    console.log(`✅ Real-time transaction created: ID ${newTransaction.id}`);
    
    return res.status(201).json({
      success: true,
      message: 'Real-time transaction created successfully',
      transaction: newTransaction,
      realTime: {
        created: true,
        timestamp: new Date().toISOString(),
        profit: profit,
        revenue: amount,
        broadcast: true,
        clientsNotified: realTimeManager.clients.size + serverSentEvents.clients.size
      }
    });

  } catch (error) {
    console.error('Real-time transaction endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Real-time transaction creation failed',
      details: error.message
    });
  }
});

// Real-time dashboard endpoint with live metrics
app.get('/api/dashboard/realtime', optionalAuth, async (req, res) => {
  try {
    console.log('📊 Real-time dashboard request');
    
    // Get live data
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!transactions) {
      return res.status(500).json({ error: 'Failed to fetch real-time data' });
    }

    // Calculate live metrics
    let totalRevenue = 0;
    let totalProfit = 0;
    let todayRevenue = 0;
    let todayTransactions = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deviceStats = {};
    const statusStats = {};

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount_given) || 0;
      const cost = parseFloat(tx.repair_cost) || 0;
      const profit = parseFloat(tx.profit) || (amount - cost);

      totalRevenue += amount;
      totalProfit += profit;

      // Today's metrics
      const txDate = new Date(tx.created_at);
      if (txDate >= today) {
        todayRevenue += amount;
        todayTransactions++;
      }

      // Device statistics
      const device = tx.device_model || 'Unknown';
      if (!deviceStats[device]) {
        deviceStats[device] = { count: 0, revenue: 0 };
      }
      deviceStats[device].count++;
      deviceStats[device].revenue += amount;

      // Status statistics
      const status = tx.status || 'Unknown';
      statusStats[status] = (statusStats[status] || 0) + 1;
    });

    const realTimeMetrics = {
      totals: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalTransactions: transactions.length,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
      },
      today: {
        revenue: Math.round(todayRevenue * 100) / 100,
        transactions: todayTransactions,
        avgTicket: todayTransactions > 0 ? Math.round((todayRevenue / todayTransactions) * 100) / 100 : 0
      },
      devices: Object.entries(deviceStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([device, stats]) => ({
          device,
          count: stats.count,
          revenue: Math.round(stats.revenue * 100) / 100
        })),
      statuses: statusStats,
      realTime: {
        timestamp: new Date().toISOString(),
        connectedClients: realTimeManager.clients.size + serverSentEvents.clients.size,
        lastUpdate: new Date().toISOString()
      }
    };

    // Broadcast metrics to connected clients
    realTimeManager.notifyDashboardUpdate(realTimeMetrics);

    res.json(realTimeMetrics);

  } catch (error) {
    console.error('Real-time dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get real-time dashboard data',
      details: error.message 
    });
  }
});

// Real-time status endpoint
app.get('/api/realtime/status', (req, res) => {
  res.json({
    realTimeEnabled: true,
    websocketClients: realTimeManager.clients.size,
    sseClients: serverSentEvents.clients.size,
    totalConnections: realTimeManager.clients.size + serverSentEvents.clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    features: [
      'Real-time transaction creation',
      'Live dashboard updates', 
      'WebSocket broadcasting',
      'Server-Sent Events',
      'Database change listeners'
    ]
  });
});

// Initialize real-time features on server startup
function initializeRealTime(server, app) {
  console.log('🚀 Initializing real-time features...');
  
  // Setup WebSocket server
  realTimeManager.initializeWebSocket(server);
  
  // Setup Server-Sent Events
  serverSentEvents.setupSSE(app);
  
  // Setup database change listeners
  const dbListener = new DatabaseChangeListener(supabase, realTimeManager);
  dbListener.initializeListeners();
  
  console.log('✅ Real-time features initialized successfully');
  console.log('📡 WebSocket server: Ready');
  console.log('📡 Server-Sent Events: Ready');
  console.log('🎧 Database listeners: Active');
}

module.exports = {
  initializeRealTime,
  realTimeManager,
  serverSentEvents
};

console.log('🔄 Real-time integration module loaded');
console.log('📋 New endpoints: /api/transactions/realtime, /api/dashboard/realtime');
console.log('🎯 Your application is now real-time enabled!');
