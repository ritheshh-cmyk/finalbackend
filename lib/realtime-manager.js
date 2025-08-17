// Real-Time WebSocket Enhancement for Business Application
// This adds real-time capabilities to your repair shop system

const WebSocket = require('ws');
const EventEmitter = require('events');

class RealTimeManager extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.lastUpdate = Date.now();
  }

  // Initialize WebSocket server
  initializeWebSocket(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('🔄 New real-time client connected');
      this.clients.add(ws);
      
      // Send initial data to new client
      this.sendToClient(ws, {
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Real-time connection established'
      });
      
      ws.on('close', () => {
        console.log('🔌 Real-time client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Real-time message error:', error);
        }
      });
    });
    
    console.log('🚀 Real-time WebSocket server initialized');
  }
  
  // Handle client messages
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'subscribe':
        this.sendToClient(ws, { 
          type: 'subscribed', 
          channel: data.channel,
          timestamp: new Date().toISOString()
        });
        break;
    }
  }
  
  // Send data to specific client
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
  
  // Broadcast to all connected clients
  broadcast(data) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Real-time transaction notifications
  notifyTransactionCreated(transaction) {
    this.broadcast({
      type: 'transaction_created',
      data: transaction,
      event: 'NEW_TRANSACTION'
    });
    console.log(`📊 Real-time: Transaction ${transaction.id} broadcasted to ${this.clients.size} clients`);
  }
  
  // Real-time dashboard updates  
  notifyDashboardUpdate(metrics) {
    this.broadcast({
      type: 'dashboard_update',
      data: metrics,
      event: 'METRICS_UPDATE'
    });
    console.log(`📈 Real-time: Dashboard metrics broadcasted to ${this.clients.size} clients`);
  }
  
  // Real-time status updates
  notifyStatusChange(transactionId, oldStatus, newStatus) {
    this.broadcast({
      type: 'status_change',
      data: {
        transactionId,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString()
      },
      event: 'STATUS_UPDATE'
    });
  }
  
  // Real-time revenue updates
  notifyRevenueUpdate(revenueData) {
    this.broadcast({
      type: 'revenue_update',
      data: revenueData,
      event: 'REVENUE_UPDATE'
    });
  }
}

// Server-Sent Events alternative for simpler implementation
class ServerSentEvents {
  constructor() {
    this.clients = new Set();
  }
  
  // Initialize SSE endpoint
  setupSSE(app) {
    app.get('/api/realtime/events', (req, res) => {
      // Set headers for SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Add client to set
      this.clients.add(res);
      console.log(`📡 SSE client connected (${this.clients.size} total)`);
      
      // Send initial connection event
      this.sendToClient(res, {
        type: 'connected',
        timestamp: new Date().toISOString()
      });
      
      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        this.sendToClient(res, {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          clients: this.clients.size
        });
      }, 30000);
      
      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        this.clients.delete(res);
        console.log(`📡 SSE client disconnected (${this.clients.size} remaining)`);
      });
    });
  }
  
  // Send event to specific client
  sendToClient(res, data) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('SSE send error:', error);
      this.clients.delete(res);
    }
  }
  
  // Broadcast to all SSE clients
  broadcast(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    this.clients.forEach(client => {
      this.sendToClient(client, event);
    });
    
    console.log(`📡 SSE broadcast: ${eventType} sent to ${this.clients.size} clients`);
  }
}

// Real-time database change listener (for Supabase)
class DatabaseChangeListener {
  constructor(supabase, realTimeManager) {
    this.supabase = supabase;
    this.realTimeManager = realTimeManager;
  }
  
  // Setup real-time database listeners
  initializeListeners() {
    // Listen for transaction changes
    const transactionChannel = this.supabase
      .channel('transactions_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('🔄 Real-time: New transaction inserted', payload.new.id);
          this.realTimeManager.notifyTransactionCreated(payload.new);
          this.updateDashboardMetrics();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('🔄 Real-time: Transaction updated', payload.new.id);
          if (payload.old.status !== payload.new.status) {
            this.realTimeManager.notifyStatusChange(
              payload.new.id,
              payload.old.status,
              payload.new.status
            );
          }
          this.updateDashboardMetrics();
        }
      )
      .subscribe();
    
    console.log('🎧 Real-time database listeners initialized');
  }
  
  // Update dashboard metrics in real-time
  async updateDashboardMetrics() {
    try {
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('amount_given, repair_cost, profit, status');
      
      if (transactions) {
        const metrics = {
          totalRevenue: transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0),
          totalProfit: transactions.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0),
          totalTransactions: transactions.length,
          completedCount: transactions.filter(tx => 
            tx.status && tx.status.toLowerCase().includes('completed')
          ).length
        };
        
        this.realTimeManager.notifyDashboardUpdate(metrics);
      }
    } catch (error) {
      console.error('Real-time metrics update error:', error);
    }
  }
}

module.exports = {
  RealTimeManager,
  ServerSentEvents,
  DatabaseChangeListener
};

console.log('🚀 Real-time enhancement modules loaded');
console.log('📋 Features: WebSocket, Server-Sent Events, Database Change Listeners');
console.log('🎯 Purpose: Make repair shop application fully real-time');
