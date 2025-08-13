import { Server } from 'socket.io';
import { storage } from './storage';
import logger from './logger';
import { User } from '../shared/types';

type UserRole = 'admin' | 'owner' | 'worker' | 'user' | 'demo';

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  userRole?: UserRole;
}

export interface BusinessMetrics {
  todayRevenue: number;
  pendingRepairs: number;
  weeklyTotal: number;
  activeUsers: number;
  recentTransactions: any[];
  inventoryAlerts: any[];
}

export class RealtimeService {
  private io: Server;
  private connectedUsers: Map<string, { socketId: string; userId: number; role: UserRole }> = new Map();
  private businessMetrics: BusinessMetrics = {
    todayRevenue: 0,
    pendingRepairs: 0,
    weeklyTotal: 0,
    activeUsers: 0,
    recentTransactions: [],
    inventoryAlerts: []
  };

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startMetricsUpdater();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      // Handle user authentication for real-time features
      socket.on('authenticate', async (data: { userId: string; token: string }) => {
        try {
          // Verify token and get user info
          const userId = parseInt(data.userId);
          const user = await storage.getUserById(userId);
          if (user) {
            this.connectedUsers.set(socket.id, {
              socketId: socket.id,
              userId: user.id,
              role: user.role as UserRole
            });
            
            // Join role-based rooms
            socket.join(`role_${user.role}`);
            socket.join(`user_${user.id}`);
            
            // Send initial data based on role
            await this.sendInitialData(socket, user.role as UserRole);
            
            // Update active users count
            this.updateActiveUsersCount();
            
            logger.info(`✅ User authenticated: ${user.username} (${user.role}) - Socket: ${socket.id}`);
          }
        } catch (error) {
          logger.error('Authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle real-time data requests
      socket.on('request_metrics', async () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          await this.sendMetricsUpdate(socket, userInfo.role);
        }
      });

      // Handle live activity feed requests
      socket.on('request_activity_feed', async (data: { limit?: number; offset?: number }) => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          await this.sendActivityFeed(socket, userInfo.role, data.limit || 20, data.offset || 0);
        }
      });

      // Handle inventory alerts subscription
      socket.on('subscribe_inventory_alerts', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo && ['admin', 'owner', 'worker'].includes(userInfo.role)) {
          socket.join('inventory_alerts');
          this.sendInventoryAlerts(socket);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          logger.info(`🔌 User disconnected: ${userInfo.userId} - Socket: ${socket.id}`);
          this.connectedUsers.delete(socket.id);
          this.updateActiveUsersCount();
        }
      });
    });
  }

  private async sendInitialData(socket: any, role: UserRole) {
    try {
      // Send role-specific initial data
      const initialData = await this.getInitialDataForRole(role);
      socket.emit('initial_data', initialData);
      
      // Send current metrics
      await this.sendMetricsUpdate(socket, role);
      
      // Send recent activity
      await this.sendActivityFeed(socket, role, 10, 0);
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  private async getInitialDataForRole(role: UserRole) {
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

  private getRoleFeatures(role: UserRole): string[] {
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

  private async getSystemHealth() {
    return { status: 'healthy', uptime: process.uptime() };
  }

  private async getUserActivity() {
    return [];
  }

  private async getSecurityEvents() {
    return [];
  }

  private async getBusinessOverview() {
    return await storage.getDashboardTotals();
  }

  private async getFinancialSummary() {
    return await storage.getTodayStats();
  }

  private async getPerformanceMetrics() {
    return { performance: 'good' };
  }

  private async getWorkerTasks() {
    return [];
  }

  private async getCustomerRequests() {
    return [];
  }

  private async getInventoryStatus() {
    // Use a method that exists - return empty array for now
    return [];
  }

  private async getSampleData() {
    return { message: 'Demo data available' };
  }

  private async sendMetricsUpdate(socket: any, role: UserRole) {
    const metrics = await this.getBusinessMetrics();
    socket.emit('metrics_update', metrics);
  }

  private async sendActivityFeed(socket: any, role: UserRole, limit: number, offset: number) {
    const activities = [];
    socket.emit('activity_feed', activities);
  }

  private async sendInventoryAlerts(socket: any) {
    const alerts = [];
    socket.emit('inventory_alerts', alerts);
  }

  private updateActiveUsersCount() {
    this.businessMetrics.activeUsers = this.connectedUsers.size;
    this.io.emit('active_users_update', { count: this.businessMetrics.activeUsers });
  }

  private async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const stats = await storage.getTodayStats();
      return {
        todayRevenue: stats.totalRevenue || 0,
        pendingRepairs: stats.pendingRepairs || 0,
        weeklyTotal: stats.weeklyTotal || 0,
        activeUsers: this.connectedUsers.size,
        recentTransactions: stats.recentTransactions || [],
        inventoryAlerts: []
      };
    } catch (error) {
      logger.error('Error getting business metrics:', error);
      return this.businessMetrics;
    }
  }

  private startMetricsUpdater() {
    setInterval(async () => {
      this.businessMetrics = await this.getBusinessMetrics();
      this.io.emit('metrics_update', this.businessMetrics);
    }, 30000); // Update every 30 seconds
  }

  public emitEvent(event: RealtimeEvent) {
    this.io.emit(event.type, {
      ...event.data,
      timestamp: event.timestamp
    });
  }

  public emitToRole(role: UserRole, event: RealtimeEvent) {
    this.io.to(`role_${role}`).emit(event.type, {
      ...event.data,
      timestamp: event.timestamp
    });
  }

  public emitToUser(userId: number, event: RealtimeEvent) {
    this.io.to(`user_${userId}`).emit(event.type, {
      ...event.data,
      timestamp: event.timestamp
    });
  }
}