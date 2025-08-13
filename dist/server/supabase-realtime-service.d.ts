import { Server } from 'socket.io';
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
    userId: string;
    username: string;
    role: UserRole;
    email: string;
    shop_id?: number;
}
export declare class SupabaseRealtimeService {
    private io;
    private connectedUsers;
    private businessMetrics;
    private metricsUpdateInterval;
    constructor(io: Server);
    private setupSocketHandlers;
    private sendInitialData;
    private sendMetricsUpdate;
    private sendActivityFeed;
    private sendInventoryAlerts;
    private sendPendingNotifications;
    private broadcastUserStatusUpdate;
    private updateActiveUsersCount;
    private startMetricsUpdater;
    private updateBusinessMetrics;
    private filterMetricsByRole;
    private getActivityFeed;
    broadcastTransactionUpdate(transaction: any): void;
    broadcastInventoryUpdate(item: any): void;
    broadcastNotification(userId: string, notification: any): void;
    broadcastToRole(role: UserRole, event: string, data: any): void;
    broadcastToShop(shopId: number, event: string, data: any): void;
    getConnectedUsers(): ConnectedUser[];
    getUserBySocketId(socketId: string): ConnectedUser | undefined;
    isUserConnected(userId: string): boolean;
    disconnect(): void;
}
export default SupabaseRealtimeService;
//# sourceMappingURL=supabase-realtime-service.d.ts.map