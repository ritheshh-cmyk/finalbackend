"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockStorage = exports.MockDatabaseStorage = void 0;
class MockDatabaseStorage {
    async getUserByUsername(username) {
        if (username === 'admin') {
            return {
                id: 1,
                username: 'admin',
                password: '$2a$10$...',
                role: 'admin',
                shop_id: '1',
                created_at: new Date().toISOString()
            };
        }
        return null;
    }
    async getUserById(id) {
        return {
            id,
            username: `user${id}`,
            password: '$2a$10$...',
            role: 'worker',
            shop_id: '1',
            created_at: new Date().toISOString()
        };
    }
    async createUser(data) {
        return {
            id: Date.now(),
            username: data.username,
            password: '$2a$10$...',
            role: data.role || 'worker',
            shop_id: data.shop_id || '1',
            created_at: new Date().toISOString()
        };
    }
    async getAllUsers() {
        return [
            {
                id: 1,
                username: 'admin',
                password: '$2a$10$...',
                role: 'admin',
                shop_id: '1',
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                username: 'worker1',
                password: '$2a$10$...',
                role: 'worker',
                shop_id: '1',
                created_at: new Date().toISOString()
            }
        ];
    }
    async updateUser(id, data) {
        return {
            id,
            username: data.username || `user${id}`,
            password: '$2a$10$...',
            role: data.role || 'worker',
            shop_id: data.shop_id || '1',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        };
    }
    async deleteUser(id) {
        return true;
    }
    async getTransactions(limit, offset) {
        const mockTransactions = [];
        const count = Math.min(limit || 33, 100);
        for (let i = 1; i <= count; i++) {
            mockTransactions.push({
                id: i,
                customerName: `Customer ${i}`,
                mobileNumber: `123456789${i % 10}`,
                deviceModel: `Device Model ${i}`,
                repairType: 'Screen Replacement',
                repairCost: 100 + (i * 50),
                amountGiven: 100 + (i * 50),
                changeReturned: 0,
                paymentMethod: 'cash',
                status: 'completed',
                created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
            });
        }
        return mockTransactions;
    }
    async searchTransactions(query) {
        const transactions = await this.getTransactions(50);
        return transactions.filter(t => t.customerName?.toLowerCase().includes(query.toLowerCase()) ||
            t.deviceModel?.toLowerCase().includes(query.toLowerCase()));
    }
    async createTransaction(data) {
        return {
            id: Date.now(),
            ...data,
            status: data.status || 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    async getSuppliers() {
        const mockSuppliers = [];
        for (let i = 1; i <= 15; i++) {
            mockSuppliers.push({
                id: i,
                name: `Supplier ${i}`,
                contact: `contact${i}@supplier.com`,
                phone: `123-456-789${i % 10}`,
                address: `Address ${i}`,
                created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
            });
        }
        return mockSuppliers;
    }
    async createSupplier(data) {
        return {
            id: Date.now(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    async getExpenditures(limit, offset) {
        return [];
    }
    async createExpenditure(data) {
        return {
            id: Date.now(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    async getGroupedExpenditures(limit, offset) {
        return [];
    }
    async createGroupedExpenditure(data) {
        return {
            id: Date.now(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    async getPurchaseOrders(limit, offset) {
        return [];
    }
    async getSupplierPayments(supplierId) {
        return [];
    }
    async getTodayStats() {
        return { totalRevenue: 2500, totalTransactions: 5 };
    }
    async getWeekStats() {
        return { totalRevenue: 15000, totalTransactions: 28 };
    }
    async getMonthStats() {
        return { totalRevenue: 45000, totalTransactions: 95 };
    }
    async getYearStats() {
        return { totalRevenue: 540000, totalTransactions: 1200 };
    }
    async getDashboardTotals() {
        return {
            totalRevenue: 45000,
            totalTransactions: 95,
            totalSuppliers: 15,
            totalExpenditures: 8500,
            totalProfit: 36500,
            totalCustomers: 95,
            totalBills: 0,
            totalInventory: 0,
            totalPurchaseOrders: 0
        };
    }
    async getDashboardStats() {
        return {
            weekly: { totalRevenue: 15000, totalTransactions: 28 },
            monthly: { totalRevenue: 45000, totalTransactions: 95 },
            today: { totalRevenue: 2500, totalTransactions: 5 }
        };
    }
    async getBills(limit, offset) {
        return [];
    }
    async createBill(data) {
        return { id: Date.now(), ...data, created_at: new Date().toISOString() };
    }
    async getReports() {
        return [
            { id: 1, name: 'Daily Sales Report', type: 'sales', created_at: new Date().toISOString() },
            { id: 2, name: 'Weekly Revenue Report', type: 'revenue', created_at: new Date().toISOString() },
            { id: 3, name: 'Monthly Transactions Report', type: 'transactions', created_at: new Date().toISOString() },
            { id: 4, name: 'Supplier Performance Report', type: 'suppliers', created_at: new Date().toISOString() },
            { id: 5, name: 'Expenditure Analysis Report', type: 'expenditures', created_at: new Date().toISOString() },
            { id: 6, name: 'Profit & Loss Report', type: 'financial', created_at: new Date().toISOString() }
        ];
    }
    async getTransactionReports(period) {
        const allTransactions = await this.getTransactions(100);
        const now = new Date();
        let startDate;
        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        return allTransactions.filter(t => new Date(t.created_at) >= startDate);
    }
    async getRecentTransactions(limit = 5) {
        const transactions = await this.getTransactions(limit);
        return transactions;
    }
    async getUserSettings(userId) {
        return { theme: 'light', notifications: true, language: 'en' };
    }
    async getSettings(userId) {
        return [{ theme: 'light', notifications: true, language: 'en' }];
    }
    async getPermissions(userId) {
        return { canCreate: true, canEdit: true, canDelete: false, canView: true };
    }
    async getActivityLog(userId) {
        return [];
    }
    async getNotifications(userId) {
        return [];
    }
}
exports.MockDatabaseStorage = MockDatabaseStorage;
exports.mockStorage = new MockDatabaseStorage();
//# sourceMappingURL=storage-mock.js.map