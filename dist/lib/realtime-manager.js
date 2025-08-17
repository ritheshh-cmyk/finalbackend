const WebSocket = require('ws');
const EventEmitter = require('events');
class RealTimeManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Set();
        this.lastUpdate = Date.now();
    }
    initializeWebSocket(server) {
        this.wss = new WebSocket.Server({ server });
        this.wss.on('connection', (ws) => {
            console.log('🔄 New real-time client connected');
            this.clients.add(ws);
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
                }
                catch (error) {
                    console.error('Real-time message error:', error);
                }
            });
        });
        console.log('🚀 Real-time WebSocket server initialized');
    }
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
    sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
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
    notifyTransactionCreated(transaction) {
        this.broadcast({
            type: 'transaction_created',
            data: transaction,
            event: 'NEW_TRANSACTION'
        });
        console.log(`📊 Real-time: Transaction ${transaction.id} broadcasted to ${this.clients.size} clients`);
    }
    notifyDashboardUpdate(metrics) {
        this.broadcast({
            type: 'dashboard_update',
            data: metrics,
            event: 'METRICS_UPDATE'
        });
        console.log(`📈 Real-time: Dashboard metrics broadcasted to ${this.clients.size} clients`);
    }
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
    notifyRevenueUpdate(revenueData) {
        this.broadcast({
            type: 'revenue_update',
            data: revenueData,
            event: 'REVENUE_UPDATE'
        });
    }
}
class ServerSentEvents {
    constructor() {
        this.clients = new Set();
    }
    setupSSE(app) {
        app.get('/api/realtime/events', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            this.clients.add(res);
            console.log(`📡 SSE client connected (${this.clients.size} total)`);
            this.sendToClient(res, {
                type: 'connected',
                timestamp: new Date().toISOString()
            });
            const heartbeat = setInterval(() => {
                this.sendToClient(res, {
                    type: 'heartbeat',
                    timestamp: new Date().toISOString(),
                    clients: this.clients.size
                });
            }, 30000);
            req.on('close', () => {
                clearInterval(heartbeat);
                this.clients.delete(res);
                console.log(`📡 SSE client disconnected (${this.clients.size} remaining)`);
            });
        });
    }
    sendToClient(res, data) {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        catch (error) {
            console.error('SSE send error:', error);
            this.clients.delete(res);
        }
    }
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
class DatabaseChangeListener {
    constructor(supabase, realTimeManager) {
        this.supabase = supabase;
        this.realTimeManager = realTimeManager;
    }
    initializeListeners() {
        const transactionChannel = this.supabase
            .channel('transactions_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
            console.log('🔄 Real-time: New transaction inserted', payload.new.id);
            this.realTimeManager.notifyTransactionCreated(payload.new);
            this.updateDashboardMetrics();
        })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, (payload) => {
            console.log('🔄 Real-time: Transaction updated', payload.new.id);
            if (payload.old.status !== payload.new.status) {
                this.realTimeManager.notifyStatusChange(payload.new.id, payload.old.status, payload.new.status);
            }
            this.updateDashboardMetrics();
        })
            .subscribe();
        console.log('🎧 Real-time database listeners initialized');
    }
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
                    completedCount: transactions.filter(tx => tx.status && tx.status.toLowerCase().includes('completed')).length
                };
                this.realTimeManager.notifyDashboardUpdate(metrics);
            }
        }
        catch (error) {
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
//# sourceMappingURL=realtime-manager.js.map