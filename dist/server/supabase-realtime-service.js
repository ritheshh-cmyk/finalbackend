"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseRealtimeService = void 0;
const supabase_auth_1 = __importDefault(require("./supabase-auth"));
const logger_1 = __importDefault(require("./logger"));
class SupabaseRealtimeService {
    constructor(io) {
        this.connectedUsers = new Map();
        this.businessMetrics = {
            todayRevenue: 0,
            pendingRepairs: 0,
            weeklyTotal: 0,
            activeUsers: 0,
            recentTransactions: [],
            inventoryAlerts: []
        };
        this.metricsUpdateInterval = null;
        this.io = io;
        this.setupSocketHandlers();
        this.startMetricsUpdater();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info(`🔌 Client connected: ${socket.id}`);
            socket.on('authenticate', async (data) => {
                try {
                    if (!data.token) {
                        socket.emit('auth_error', { message: 'Token is required' });
                        return;
                    }
                    const result = await supabase_auth_1.default.verifyToken(data.token);
                    if (!result || !result.user || !result.profile) {
                        socket.emit('auth_error', { message: 'Invalid token' });
                        return;
                    }
                    const connectedUser = {
                        socketId: socket.id,
                        userId: result.user.id,
                        username: result.profile.username,
                        role: result.profile.role,
                        email: result.user.email || '',
                        shop_id: result.profile.shop_id
                    };
                    this.connectedUsers.set(socket.id, connectedUser);
                    socket.join(`role_${result.profile.role}`);
                    socket.join(`user_${result.user.id}`);
                    if (result.profile.shop_id) {
                        socket.join(`shop_${result.profile.shop_id}`);
                    }
                    await this.sendInitialData(socket, result.profile.role);
                    this.updateActiveUsersCount();
                    logger_1.default.info(`✅ User authenticated via Supabase: ${result.profile.username} (${result.profile.role}) - Socket: ${socket.id}`);
                    socket.emit('authenticated', {
                        user: {
                            id: result.user.id,
                            username: result.profile.username,
                            role: result.profile.role,
                            email: result.user.email,
                            shop_id: result.profile.shop_id
                        }
                    });
                }
                catch (error) {
                    logger_1.default.error('Socket authentication error:', error);
                    socket.emit('auth_error', {
                        message: 'Authentication failed',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            socket.on('request_metrics', async () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    await this.sendMetricsUpdate(socket, userInfo.role);
                }
                else {
                    socket.emit('auth_error', { message: 'Not authenticated' });
                }
            });
            socket.on('request_activity_feed', async (data) => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    await this.sendActivityFeed(socket, userInfo.role, data.limit || 20, data.offset || 0);
                }
                else {
                    socket.emit('auth_error', { message: 'Not authenticated' });
                }
            });
            socket.on('subscribe_inventory_alerts', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo && ['admin', 'owner', 'worker'].includes(userInfo.role)) {
                    socket.join('inventory_alerts');
                    this.sendInventoryAlerts(socket);
                }
                else {
                    socket.emit('error', { message: 'Insufficient permissions' });
                }
            });
            socket.on('subscribe_notifications', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    socket.join(`notifications_${userInfo.userId}`);
                    socket.join(`notifications_role_${userInfo.role}`);
                    this.sendPendingNotifications(socket, userInfo);
                }
            });
            socket.on('subscribe_transactions', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    socket.join('transactions');
                    if (userInfo.shop_id) {
                        socket.join(`transactions_shop_${userInfo.shop_id}`);
                    }
                }
            });
            socket.on('update_status', (status) => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    this.broadcastUserStatusUpdate(userInfo, status);
                }
            });
            socket.on('disconnect', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    logger_1.default.info(`🔌 User disconnected: ${userInfo.username} - Socket: ${socket.id}`);
                    this.connectedUsers.delete(socket.id);
                    this.updateActiveUsersCount();
                    this.broadcastUserStatusUpdate(userInfo, 'offline');
                }
                else {
                    logger_1.default.info(`🔌 Anonymous client disconnected: ${socket.id}`);
                }
            });
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
        });
    }
    async sendInitialData(socket, role) {
        try {
            await this.sendMetricsUpdate(socket, role);
            if (['admin', 'owner'].includes(role)) {
                socket.emit('admin_data', {
                    connectedUsers: Array.from(this.connectedUsers.values()).map(user => ({
                        username: user.username,
                        role: user.role,
                        status: 'online'
                    }))
                });
            }
            await this.sendActivityFeed(socket, role, 10, 0);
        }
        catch (error) {
            logger_1.default.error('Error sending initial data:', error);
            socket.emit('error', { message: 'Failed to load initial data' });
        }
    }
    async sendMetricsUpdate(socket, role) {
        try {
            await this.updateBusinessMetrics(role);
            const filteredMetrics = this.filterMetricsByRole(this.businessMetrics, role);
            socket.emit('metrics_update', filteredMetrics);
        }
        catch (error) {
            logger_1.default.error('Error sending metrics update:', error);
            socket.emit('error', { message: 'Failed to update metrics' });
        }
    }
    async sendActivityFeed(socket, role, limit, offset) {
        try {
            const activities = await this.getActivityFeed(role, limit, offset);
            socket.emit('activity_feed', { activities, limit, offset });
        }
        catch (error) {
            logger_1.default.error('Error sending activity feed:', error);
            socket.emit('error', { message: 'Failed to load activity feed' });
        }
    }
    sendInventoryAlerts(socket) {
        try {
            socket.emit('inventory_alerts', this.businessMetrics.inventoryAlerts);
        }
        catch (error) {
            logger_1.default.error('Error sending inventory alerts:', error);
        }
    }
    sendPendingNotifications(socket, user) {
        try {
            socket.emit('notifications', { pending: [] });
        }
        catch (error) {
            logger_1.default.error('Error sending pending notifications:', error);
        }
    }
    broadcastUserStatusUpdate(user, status) {
        this.io.to('role_admin').to('role_owner').emit('user_status_update', {
            userId: user.userId,
            username: user.username,
            role: user.role,
            status,
            timestamp: new Date().toISOString()
        });
    }
    updateActiveUsersCount() {
        this.businessMetrics.activeUsers = this.connectedUsers.size;
        this.io.to('role_admin').to('role_owner').emit('active_users_update', {
            count: this.businessMetrics.activeUsers,
            users: Array.from(this.connectedUsers.values()).map(user => ({
                username: user.username,
                role: user.role
            }))
        });
    }
    startMetricsUpdater() {
        this.metricsUpdateInterval = setInterval(async () => {
            try {
                await this.updateBusinessMetrics('admin');
                for (const [socketId, user] of this.connectedUsers) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        await this.sendMetricsUpdate(socket, user.role);
                    }
                }
            }
            catch (error) {
                logger_1.default.error('Error in metrics updater:', error);
            }
        }, 30000);
        logger_1.default.info('🔄 Metrics updater started (30s interval)');
    }
    async updateBusinessMetrics(role) {
        try {
            this.businessMetrics = {
                ...this.businessMetrics,
                todayRevenue: Math.floor(Math.random() * 10000),
                pendingRepairs: Math.floor(Math.random() * 50),
                weeklyTotal: Math.floor(Math.random() * 50000),
                activeUsers: this.connectedUsers.size,
            };
        }
        catch (error) {
            logger_1.default.error('Error updating business metrics:', error);
        }
    }
    filterMetricsByRole(metrics, role) {
        switch (role) {
            case 'admin':
                return metrics;
            case 'owner':
                return {
                    todayRevenue: metrics.todayRevenue,
                    pendingRepairs: metrics.pendingRepairs,
                    weeklyTotal: metrics.weeklyTotal,
                    activeUsers: metrics.activeUsers,
                    recentTransactions: metrics.recentTransactions.slice(0, 10)
                };
            case 'worker':
                return {
                    pendingRepairs: metrics.pendingRepairs,
                    inventoryAlerts: metrics.inventoryAlerts
                };
            default:
                return {
                    activeUsers: metrics.activeUsers
                };
        }
    }
    async getActivityFeed(role, limit, offset) {
        return [];
    }
    broadcastTransactionUpdate(transaction) {
        this.io.to('transactions').emit('transaction_update', {
            type: 'transaction_created',
            data: transaction,
            timestamp: new Date().toISOString()
        });
    }
    broadcastInventoryUpdate(item) {
        this.io.to('inventory_alerts').emit('inventory_update', {
            type: 'inventory_changed',
            data: item,
            timestamp: new Date().toISOString()
        });
    }
    broadcastNotification(userId, notification) {
        this.io.to(`notifications_${userId}`).emit('new_notification', notification);
    }
    broadcastToRole(role, event, data) {
        this.io.to(`role_${role}`).emit(event, data);
    }
    broadcastToShop(shopId, event, data) {
        this.io.to(`shop_${shopId}`).emit(event, data);
    }
    getConnectedUsers() {
        return Array.from(this.connectedUsers.values());
    }
    getUserBySocketId(socketId) {
        return this.connectedUsers.get(socketId);
    }
    isUserConnected(userId) {
        for (const user of this.connectedUsers.values()) {
            if (user.userId === userId) {
                return true;
            }
        }
        return false;
    }
    disconnect() {
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
            this.metricsUpdateInterval = null;
        }
        logger_1.default.info('🔌 Realtime service disconnected');
    }
}
exports.SupabaseRealtimeService = SupabaseRealtimeService;
exports.default = SupabaseRealtimeService;
//# sourceMappingURL=supabase-realtime-service.js.map