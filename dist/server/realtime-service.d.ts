import { Server } from 'socket.io';
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
export declare class RealtimeService {
    private io;
    private connectedUsers;
    private businessMetrics;
    constructor(io: Server);
    private setupSocketHandlers;
    private sendInitialData;
    private getInitialDataForRole;
    private getRoleFeatures;
    private getSystemHealth;
    private getUserActivity;
    private getSecurityEvents;
    private getBusinessOverview;
    private getFinancialSummary;
    private getPerformanceMetrics;
    private getWorkerTasks;
    private getCustomerRequests;
    private getInventoryStatus;
    private getSampleData;
    private sendMetricsUpdate;
    private sendActivityFeed;
    private sendInventoryAlerts;
    private updateActiveUsersCount;
    private getBusinessMetrics;
    private startMetricsUpdater;
    emitEvent(event: RealtimeEvent): void;
    emitToRole(role: UserRole, event: RealtimeEvent): void;
    emitToUser(userId: number, event: RealtimeEvent): void;
}
export {};
//# sourceMappingURL=realtime-service.d.ts.map