import { Server, Socket } from 'socket.io';
import SupabaseAuthService from './supabase-auth';
import logger from './logger';

type UserRole = 'admin' | 'owner' | 'worker' | 'demo';

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

export interface ConnectedUser {
  socketId: string;
  userId: string; // Supabase UUID
  username: string;
  role: UserRole;
  email: string;
  shop_id?: number;
}

export class SupabaseRealtimeService {
  private io: Server;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private businessMetrics: BusinessMetrics = {
    todayRevenue: 0,
    pendingRepairs: 0,
    weeklyTotal: 0,
    activeUsers: 0,
    recentTransactions: [],
    inventoryAlerts: []
  };
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startMetricsUpdater();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      // Handle user authentication for real-time features using Supabase token
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          if (!data.token) {
            socket.emit('auth_error', { message: 'Token is required' });
            return;
          }

          // Verify token with Supabase Auth
          const result = await SupabaseAuthService.verifyToken(data.token);
          
          if (!result || !result.user || !result.profile) {
            socket.emit('auth_error', { message: 'Invalid token' });
            return;
          }

          const connectedUser: ConnectedUser = {
            socketId: socket.id,
            userId: result.user.id,
            username: result.profile.username,
            role: result.profile.role as UserRole,
            email: result.user.email || '',
            shop_id: result.profile.shop_id
          };

          this.connectedUsers.set(socket.id, connectedUser);
          
          // Join role-based rooms
          socket.join(`role_${result.profile.role}`);
          socket.join(`user_${result.user.id}`);
          
          // Join shop-specific room if user has shop_id
          if (result.profile.shop_id) {
            socket.join(`shop_${result.profile.shop_id}`);
          }
          
          // Send initial data based on role
          await this.sendInitialData(socket, result.profile.role as UserRole);
          
          // Update active users count
          this.updateActiveUsersCount();
          
          logger.info(`✅ User authenticated via Supabase: ${result.profile.username} (${result.profile.role}) - Socket: ${socket.id}`);
          
          socket.emit('authenticated', {
            user: {
              id: result.user.id,
              username: result.profile.username,
              role: result.profile.role,
              email: result.user.email,
              shop_id: result.profile.shop_id
            }
          });

        } catch (error) {
          logger.error('Socket authentication error:', error);
          socket.emit('auth_error', { 
            message: 'Authentication failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle real-time data requests
      socket.on('request_metrics', async () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          await this.sendMetricsUpdate(socket, userInfo.role);
        } else {
          socket.emit('auth_error', { message: 'Not authenticated' });
        }
      });

      // Handle live activity feed requests
      socket.on('request_activity_feed', async (data: { limit?: number; offset?: number }) => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          await this.sendActivityFeed(socket, userInfo.role, data.limit || 20, data.offset || 0);
        } else {
          socket.emit('auth_error', { message: 'Not authenticated' });
        }
      });

      // Handle inventory alerts subscription
      socket.on('subscribe_inventory_alerts', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo && ['admin', 'owner', 'worker'].includes(userInfo.role)) {
          socket.join('inventory_alerts');
          this.sendInventoryAlerts(socket);
        } else {
          socket.emit('error', { message: 'Insufficient permissions' });
        }
      });

      // Handle notification subscription
      socket.on('subscribe_notifications', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          socket.join(`notifications_${userInfo.userId}`);
          socket.join(`notifications_role_${userInfo.role}`);
          
          // Send pending notifications
          this.sendPendingNotifications(socket, userInfo);
        }
      });

      // Handle transaction updates subscription
      socket.on('subscribe_transactions', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          socket.join('transactions');
          // Filter by shop if user has shop_id
          if (userInfo.shop_id) {
            socket.join(`transactions_shop_${userInfo.shop_id}`);
          }
        }
      });

      // Handle user status update
      socket.on('update_status', (status: 'online' | 'away' | 'busy') => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          this.broadcastUserStatusUpdate(userInfo, status);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          logger.info(`🔌 User disconnected: ${userInfo.username} - Socket: ${socket.id}`);
          this.connectedUsers.delete(socket.id);
          this.updateActiveUsersCount();
          this.broadcastUserStatusUpdate(userInfo, 'offline');
        } else {
          logger.info(`🔌 Anonymous client disconnected: ${socket.id}`);
        }
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  private async sendInitialData(socket: Socket, role: UserRole) {
    try {
      // Send role-specific initial data
      await this.sendMetricsUpdate(socket, role);
      
      if (['admin', 'owner'].includes(role)) {
        // Send admin/owner specific data
        socket.emit('admin_data', {
          connectedUsers: Array.from(this.connectedUsers.values()).map(user => ({
            username: user.username,
            role: user.role,
            status: 'online'
          }))
        });
      }

      // Send recent activity
      await this.sendActivityFeed(socket, role, 10, 0);

    } catch (error) {
      logger.error('Error sending initial data:', error);
      socket.emit('error', { message: 'Failed to load initial data' });
    }
  }

  private async sendMetricsUpdate(socket: Socket, role: UserRole) {
    try {
      // Update metrics from database (would need to implement based on your database schema)
      await this.updateBusinessMetrics(role);
      
      // Send role-filtered metrics
      const filteredMetrics = this.filterMetricsByRole(this.businessMetrics, role);
      socket.emit('metrics_update', filteredMetrics);
      
    } catch (error) {
      logger.error('Error sending metrics update:', error);
      socket.emit('error', { message: 'Failed to update metrics' });
    }
  }

  private async sendActivityFeed(socket: Socket, role: UserRole, limit: number, offset: number) {
    try {
      // This would query your activity log table based on role permissions
      const activities = await this.getActivityFeed(role, limit, offset);
      socket.emit('activity_feed', { activities, limit, offset });
      
    } catch (error) {
      logger.error('Error sending activity feed:', error);
      socket.emit('error', { message: 'Failed to load activity feed' });
    }
  }

  private sendInventoryAlerts(socket: Socket) {
    try {
      // Send current inventory alerts
      socket.emit('inventory_alerts', this.businessMetrics.inventoryAlerts);
    } catch (error) {
      logger.error('Error sending inventory alerts:', error);
    }
  }

  private sendPendingNotifications(socket: Socket, user: ConnectedUser) {
    try {
      // This would query notifications for the specific user
      // Implementation depends on your notifications table structure
      socket.emit('notifications', { pending: [] });
    } catch (error) {
      logger.error('Error sending pending notifications:', error);
    }
  }

  private broadcastUserStatusUpdate(user: ConnectedUser, status: 'online' | 'away' | 'busy' | 'offline') {
    // Broadcast to admin/owner rooms
    this.io.to('role_admin').to('role_owner').emit('user_status_update', {
      userId: user.userId,
      username: user.username,
      role: user.role,
      status,
      timestamp: new Date().toISOString()
    });
  }

  private updateActiveUsersCount() {
    this.businessMetrics.activeUsers = this.connectedUsers.size;
    
    // Broadcast updated count to all admin/owner users
    this.io.to('role_admin').to('role_owner').emit('active_users_update', {
      count: this.businessMetrics.activeUsers,
      users: Array.from(this.connectedUsers.values()).map(user => ({
        username: user.username,
        role: user.role
      }))
    });
  }

  private startMetricsUpdater() {
    // Update metrics every 30 seconds
    this.metricsUpdateInterval = setInterval(async () => {
      try {
        await this.updateBusinessMetrics('admin');
        
        // Broadcast metrics to all connected users based on their roles
        for (const [socketId, user] of this.connectedUsers) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            await this.sendMetricsUpdate(socket, user.role);
          }
        }
        
      } catch (error) {
        logger.error('Error in metrics updater:', error);
      }
    }, 30000);

    logger.info('🔄 Metrics updater started (30s interval)');
  }

  private async updateBusinessMetrics(role: UserRole) {
    try {
      // This would update metrics from your database
      // Implementation depends on your database schema
      
      // Placeholder implementation
      this.businessMetrics = {
        ...this.businessMetrics,
        todayRevenue: Math.floor(Math.random() * 10000),
        pendingRepairs: Math.floor(Math.random() * 50),
        weeklyTotal: Math.floor(Math.random() * 50000),
        activeUsers: this.connectedUsers.size,
      };
      
    } catch (error) {
      logger.error('Error updating business metrics:', error);
    }
  }

  private filterMetricsByRole(metrics: BusinessMetrics, role: UserRole): Partial<BusinessMetrics> {
    // Filter metrics based on user role
    switch (role) {
      case 'admin':
        return metrics; // Admin sees everything
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

  private async getActivityFeed(role: UserRole, limit: number, offset: number): Promise<any[]> {
    // This would query your activity log based on role permissions
    // Placeholder implementation
    return [];
  }

  // Public methods for broadcasting events

  public broadcastTransactionUpdate(transaction: any) {
    this.io.to('transactions').emit('transaction_update', {
      type: 'transaction_created',
      data: transaction,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastInventoryUpdate(item: any) {
    this.io.to('inventory_alerts').emit('inventory_update', {
      type: 'inventory_changed',
      data: item,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastNotification(userId: string, notification: any) {
    this.io.to(`notifications_${userId}`).emit('new_notification', notification);
  }

  public broadcastToRole(role: UserRole, event: string, data: any) {
    this.io.to(`role_${role}`).emit(event, data);
  }

  public broadcastToShop(shopId: number, event: string, data: any) {
    this.io.to(`shop_${shopId}`).emit(event, data);
  }

  public getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getUserBySocketId(socketId: string): ConnectedUser | undefined {
    return this.connectedUsers.get(socketId);
  }

  public isUserConnected(userId: string): boolean {
    for (const user of this.connectedUsers.values()) {
      if (user.userId === userId) {
        return true;
      }
    }
    return false;
  }

  public disconnect() {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    logger.info('🔌 Realtime service disconnected');
  }
}

export default SupabaseRealtimeService;
