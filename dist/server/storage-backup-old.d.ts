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
    getTransactions(): Promise<any[]>;
    createTransaction(transactionData: any): Promise<any>;
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
    getTodayStats(): Promise<any>;
    getWeekStats(): Promise<any>;
    getMonthStats(): Promise<any>;
    getYearStats(): Promise<any>;
    getDashboardTotals(): Promise<any>;
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
}
export declare const storage: DatabaseStorage;
export default storage;
//# sourceMappingURL=storage-backup-old.d.ts.map