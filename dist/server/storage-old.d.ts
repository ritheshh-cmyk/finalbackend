import { type User, type InsertUser, type Transaction, type InsertTransaction, type Supplier, type InsertSupplier, type PurchaseOrder, type SupplierPayment, type Expenditure, type InsertExpenditure, type GroupedExpenditure, type InsertGroupedExpenditure } from "../shared/schema";
export declare class DatabaseStorage {
    getUserByUsername(username: string): Promise<any | null>;
    getUserById(id: number): Promise<User | null>;
    createUser(data: InsertUser): Promise<User>;
    getAllUsers(): Promise<User[]>;
    updateUser(id: number, data: any): Promise<User | null>;
    deleteUser(id: number): Promise<boolean>;
    getTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
    searchTransactions(query: string): Promise<Transaction[]>;
    createTransaction(data: InsertTransaction): Promise<Transaction>;
    getSuppliers(): Promise<Supplier[]>;
    createSupplier(data: InsertSupplier): Promise<Supplier>;
    getExpenditures(limit?: number, offset?: number): Promise<Expenditure[]>;
    createExpenditure(data: InsertExpenditure): Promise<Expenditure>;
    getGroupedExpenditures(limit?: number, offset?: number): Promise<GroupedExpenditure[]>;
    createGroupedExpenditure(data: InsertGroupedExpenditure): Promise<GroupedExpenditure>;
    getPurchaseOrders(limit?: number, offset?: number): Promise<PurchaseOrder[]>;
    getSupplierPayments(supplierId?: number): Promise<SupplierPayment[]>;
    getTodayStats(): Promise<any>;
    getWeekStats(): Promise<any>;
    getMonthStats(): Promise<any>;
    getYearStats(): Promise<any>;
    getDashboardTotals(): Promise<any>;
    getDashboardStats(): Promise<any>;
    getBills(limit?: number, offset?: number): Promise<any[]>;
    createBill(data: any): Promise<any>;
    getReports(): Promise<any[]>;
    getTransactionReports(period: 'today' | 'week' | 'month'): Promise<any[]>;
    getRecentTransactions(limit?: number): Promise<any[]>;
    getUserSettings(userId?: number): Promise<any>;
    getSettings(userId?: number): Promise<any[]>;
    getPermissions(userId?: number): Promise<any>;
    getActivityLog(userId?: number): Promise<any[]>;
    getNotifications(userId?: number): Promise<any[]>;
}
export declare const storage: DatabaseStorage;
//# sourceMappingURL=storage-old.d.ts.map