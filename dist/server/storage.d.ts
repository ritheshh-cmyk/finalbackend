declare function isTransactionOlderThan24Hours(createdAt: string): boolean;
declare function canWorkerModifyTransaction(userRole: string, transactionCreatedAt: string): boolean;
interface User {
    id: number;
    username: string;
    password?: string;
    role: string;
    shop_id: string;
}
interface Supplier {
    id: number;
    name: string;
    contact_number?: string;
    address?: string;
    shop_id?: string;
}
declare class DatabaseStorage {
    getUserById(id: number): Promise<User | null>;
    getUserByUsername(username: string): Promise<User | null>;
    getUsers(): Promise<User[]>;
    createUser(userData: any): Promise<User | null>;
    getTransactions(userRole?: string): Promise<any[]>;
    createTransaction(transactionData: any): Promise<any>;
    updateTransaction(id: number, transactionData: any, userRole?: string): Promise<any>;
    deleteTransaction(id: number, userRole?: string): Promise<boolean>;
    getSuppliers(): Promise<Supplier[]>;
    createSupplier(supplierData: any): Promise<Supplier | null>;
    getBills(limit?: number, offset?: number): Promise<any[]>;
    createBill(billData: any): Promise<any>;
    getExpenditures(limit?: number, offset?: number): Promise<any[]>;
    createExpenditure(expenditureData: any): Promise<any>;
    getGroupedExpenditures(limit?: number, offset?: number): Promise<any[]>;
    createGroupedExpenditure(expenditureData: any): Promise<any>;
    getSupplierPayments(supplierId?: number): Promise<any[]>;
    getPurchaseOrders(limit?: number, offset?: number): Promise<any[]>;
    getTodayStats(userRole?: string): Promise<any>;
    getWeekStats(userRole?: string): Promise<any>;
    getMonthStats(): Promise<any>;
    getYearStats(): Promise<any>;
    getDashboardTotals(userRole?: string): Promise<any>;
    getRecentTransactions(limit?: number): Promise<any[]>;
    getAllReports(): Promise<any[]>;
    getTransactionReportsByRange(range: 'today' | 'week' | 'month'): Promise<any[]>;
    getUserSettings(): Promise<any>;
    getAllPermissions(): Promise<any>;
    getNotifications(): Promise<any>;
    getActivityLog(): Promise<any[]>;
    updateUser(id: number, data: any): Promise<User | null>;
    deleteUser(id: number): Promise<boolean>;
    searchSuppliers(query: string): Promise<Supplier[]>;
    searchTransactions(query: string, userRole?: string): Promise<any[]>;
}
export declare const storage: DatabaseStorage;
export { isTransactionOlderThan24Hours, canWorkerModifyTransaction };
export default storage;
//# sourceMappingURL=storage.d.ts.map