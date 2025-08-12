export interface User {
    id: number;
    username: string;
    role: 'admin' | 'owner' | 'worker' | 'user';
    permanent?: boolean;
    createdAt: string;
    shop_id?: string;
}
export interface Transaction {
    id: number;
    customerName: string;
    mobileNumber: string;
    deviceModel: string;
    repairType: string;
    repairCost: number;
    paymentMethod: string;
    amountGiven: number;
    changeReturned: number;
    remarks: string;
    partsCost: PartCost[];
    createdAt: string;
    createdBy: number;
    shop_id?: string;
}
export interface PartCost {
    item: string;
    cost: number;
    store: string;
    customStore?: string;
}
export interface Supplier {
    id: number;
    name: string;
    contact: string;
    address: string;
    totalDue: number;
    totalRemaining: number;
    createdAt: string;
    shop_id?: string;
}
export interface Expenditure {
    id: number;
    recipient: string;
    amount: number;
    description: string;
    remaining: number;
    createdAt: string;
    shop_id?: string;
}
export interface Payment {
    id: number;
    supplier: string;
    amount: number;
    paymentMethod: string;
    description: string;
    createdAt: string;
    createdBy: number;
    shop_id?: string;
}
export interface Bill {
    id: number;
    customerName: string;
    mobileNumber: string;
    deviceModel: string;
    repairType: string;
    repairCost: number;
    partsCost: PartCost[];
    totalAmount: number;
    billNumber: string;
    status: 'generated' | 'sent' | 'paid';
    pdfUrl?: string;
    createdAt: string;
    createdBy: number;
    shop_id?: string;
}
export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface SupplierSummary {
    [key: string]: {
        totalDue: number;
        totalRemaining: number;
    };
}
export interface SocketEvents {
    'transaction:created': (transaction: Transaction) => void;
    'transaction:updated': (transaction: Transaction) => void;
    'transaction:deleted': (transactionId: number) => void;
    'payment:created': (payment: Payment) => void;
    'payment:updated': (payment: Payment) => void;
    'payment:deleted': (paymentId: number) => void;
    'expenditure:created': (expenditure: Expenditure) => void;
    'expenditure:updated': (expenditure: Expenditure) => void;
    'expenditure:deleted': (expenditureId: number) => void;
    'supplier:updated': (supplier: Supplier) => void;
    'bill:generated': (bill: Bill) => void;
    'bill:sent': (bill: Bill) => void;
    'data:cleared': (type: string) => void;
}
//# sourceMappingURL=types.d.ts.map