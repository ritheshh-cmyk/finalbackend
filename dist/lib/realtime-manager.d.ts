export class RealTimeManager extends EventEmitter<[never]> {
    constructor();
    clients: Set<any>;
    lastUpdate: number;
    initializeWebSocket(server: any): void;
    wss: WebSocket.Server<typeof WebSocket, typeof import("http").IncomingMessage>;
    handleClientMessage(ws: any, data: any): void;
    sendToClient(ws: any, data: any): void;
    broadcast(data: any): void;
    notifyTransactionCreated(transaction: any): void;
    notifyDashboardUpdate(metrics: any): void;
    notifyStatusChange(transactionId: any, oldStatus: any, newStatus: any): void;
    notifyRevenueUpdate(revenueData: any): void;
}
export class ServerSentEvents {
    clients: Set<any>;
    setupSSE(app: any): void;
    sendToClient(res: any, data: any): void;
    broadcast(eventType: any, data: any): void;
}
export class DatabaseChangeListener {
    constructor(supabase: any, realTimeManager: any);
    supabase: any;
    realTimeManager: any;
    initializeListeners(): void;
    updateDashboardMetrics(): Promise<void>;
}
import EventEmitter = require("events");
import WebSocket = require("ws");
//# sourceMappingURL=realtime-manager.d.ts.map