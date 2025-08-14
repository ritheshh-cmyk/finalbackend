"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const storage_js_1 = require("./storage.js");
const logger_1 = __importDefault(require("./logger"));
class RealtimeService {
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
        this.io = io;
        this.setupSocketHandlers();
        this.startMetricsUpdater();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info(`🔌 Client connected: ${socket.id}`);
            socket.on('authenticate', async (data) => {
                try {
                    const userId = parseInt(data.userId);
                    const user = await storage_js_1.storage.getUserById(userId);
                    if (user) {
                        this.connectedUsers.set(socket.id, {
                            socketId: socket.id,
                            userId: user.id,
                            role: user.role
                        });
                        socket.join(`role_${user.role}`);
                        socket.join(`user_${user.id}`);
                        await this.sendInitialData(socket, user.role);
                        this.updateActiveUsersCount();
                        logger_1.default.info(`✅ User authenticated: ${user.username} (${user.role}) - Socket: ${socket.id}`);
                    }
                }
                catch (error) {
                    logger_1.default.error('Authentication error:', error);
                    socket.emit('auth_error', { message: 'Authentication failed' });
                }
            });
            socket.on('request_metrics', async () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    await this.sendMetricsUpdate(socket, userInfo.role);
                }
            });
            socket.on('request_activity_feed', async (data) => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    await this.sendActivityFeed(socket, userInfo.role, data.limit || 20, data.offset || 0);
                }
            });
            socket.on('subscribe_inventory_alerts', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo && ['admin', 'owner', 'worker'].includes(userInfo.role)) {
                    socket.join('inventory_alerts');
                    this.sendInventoryAlerts(socket);
                }
            });
            socket.on('disconnect', () => {
                const userInfo = this.connectedUsers.get(socket.id);
                if (userInfo) {
                    logger_1.default.info(`🔌 User disconnected: ${userInfo.userId} - Socket: ${socket.id}`);
                    this.connectedUsers.delete(socket.id);
                    this.updateActiveUsersCount();
                }
            });
        });
    }
    async sendInitialData(socket, role) {
        try {
            const initialData = await this.getInitialDataForRole(role);
            socket.emit('initial_data', initialData);
            await this.sendMetricsUpdate(socket, role);
            await this.sendActivityFeed(socket, role, 10, 0);
        }
        catch (error) {
            logger_1.default.error('Error sending initial data:', error);
        }
    }
    async getInitialDataForRole(role) {
        const baseData = {
            timestamp: new Date(),
            role: role,
            features: this.getRoleFeatures(role)
        };
        switch (role) {
            case 'admin':
                return {
                    ...baseData,
                    systemHealth: await this.getSystemHealth(),
                    userActivity: await this.getUserActivity(),
                    securityEvents: await this.getSecurityEvents()
                };
            case 'owner':
                return {
                    ...baseData,
                    businessOverview: await this.getBusinessOverview(),
                    financialSummary: await this.getFinancialSummary(),
                    performanceMetrics: await this.getPerformanceMetrics()
                };
            case 'worker':
                return {
                    ...baseData,
                    taskList: await this.getWorkerTasks(),
                    customerRequests: await this.getCustomerRequests(),
                    inventoryStatus: await this.getInventoryStatus()
                };
            case 'demo':
                return {
                    ...baseData,
                    sampleData: await this.getSampleData()
                };
            default:
                return baseData;
        }
    }
    getRoleFeatures(role) {
        switch (role) {
            case 'admin':
                return ['user_management', 'system_settings', 'security', 'reports'];
            case 'owner':
                return ['business_analytics', 'financial_reports', 'staff_management'];
            case 'worker':
                return ['task_management', 'customer_service', 'inventory_access'];
            case 'demo':
                return ['limited_access', 'sample_data'];
            default:
                return [];
        }
    }
    async getSystemHealth() {
        return { status: 'healthy', uptime: process.uptime() };
    }
    async getUserActivity() {
        return [];
    }
    async getSecurityEvents() {
        return [];
    }
    async getBusinessOverview() {
        return await storage_js_1.storage.getDashboardTotals();
    }
    async getFinancialSummary() {
        return await storage_js_1.storage.getTodayStats();
    }
    async getPerformanceMetrics() {
        return { performance: 'good' };
    }
    async getWorkerTasks() {
        return [];
    }
    async getCustomerRequests() {
        return [];
    }
    async getInventoryStatus() {
        return [];
    }
    async getSampleData() {
        return { message: 'Demo data available' };
    }
    async sendMetricsUpdate(socket, role) {
        const metrics = await this.getBusinessMetrics();
        socket.emit('metrics_update', metrics);
    }
    async sendActivityFeed(socket, role, limit, offset) {
        const activities = [];
        socket.emit('activity_feed', activities);
    }
    async sendInventoryAlerts(socket) {
        const alerts = [];
        socket.emit('inventory_alerts', alerts);
    }
    updateActiveUsersCount() {
        this.businessMetrics.activeUsers = this.connectedUsers.size;
        this.io.emit('active_users_update', { count: this.businessMetrics.activeUsers });
    }
    async getBusinessMetrics() {
        try {
            const stats = await storage_js_1.storage.getTodayStats();
            return {
                todayRevenue: stats.totalRevenue || 0,
                pendingRepairs: stats.pendingRepairs || 0,
                weeklyTotal: stats.weeklyTotal || 0,
                activeUsers: this.connectedUsers.size,
                recentTransactions: stats.recentTransactions || [],
                inventoryAlerts: []
            };
        }
        catch (error) {
            logger_1.default.error('Error getting business metrics:', error);
            return this.businessMetrics;
        }
    }
    startMetricsUpdater() {
        setInterval(async () => {
            this.businessMetrics = await this.getBusinessMetrics();
            this.io.emit('metrics_update', this.businessMetrics);
        }, 30000);
    }
    emitEvent(event) {
        this.io.emit(event.type, {
            ...event.data,
            timestamp: event.timestamp
        });
    }
    emitToRole(role, event) {
        this.io.to(`role_${role}`).emit(event.type, {
            ...event.data,
            timestamp: event.timestamp
        });
    }
    emitToUser(userId, event) {
        this.io.to(`user_${userId}`).emit(event.type, {
            ...event.data,
            timestamp: event.timestamp
        });
    }
}
exports.RealtimeService = RealtimeService;
//# sourceMappingURL=realtime-service.js.map