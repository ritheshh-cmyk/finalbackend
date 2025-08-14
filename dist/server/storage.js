const storage = {
    async getUserByUsername(username) {
        return {
            id: 1,
            username,
            password: '$2a$10$mocked',
            role: username === 'admin' ? 'admin' : 'worker',
            shop_id: 'default'
        };
    },
    async getUserById(id) {
        return {
            id,
            username: `user${id}`,
            password: '$2a$10$mocked',
            role: id === 1 ? 'admin' : 'worker',
            shop_id: 'default'
        };
    },
    async createUser(data) {
        return {
            id: Date.now(),
            ...data,
            password: '$2a$10$mocked',
            shop_id: 'default'
        };
    },
    async getAllUsers() {
        return [{
                id: 1,
                username: 'admin',
                password: '$2a$10$mocked',
                role: 'admin',
                shop_id: 'default'
            }];
    },
    async updateUser(id, data) {
        return { id, ...data, password: '$2a$10$mocked' };
    },
    async deleteUser() { return true; },
    async getTransactions(limit = 33) {
        const items = [];
        for (let i = 1; i <= limit; i++) {
            items.push({
                id: i,
                customerName: `Customer ${i}`,
                mobileNumber: `98765${i}`,
                deviceModel: `Device ${i}`,
                repairType: 'Screen Fix',
                repairCost: '100',
                amountGiven: '100',
                changeReturned: '0',
                paymentMethod: 'cash',
                status: 'completed',
                shop_id: 'default',
                created_at: new Date().toISOString()
            });
        }
        return items;
    },
    async createTransaction(data) {
        return { id: Date.now(), ...data, shop_id: 'default', created_at: new Date().toISOString() };
    },
    async searchTransactions() { return this.getTransactions(10); },
    async updateTransaction(id, data) { return { id, ...data }; },
    async deleteTransaction() { return true; },
    async getSuppliers(limit = 15) {
        const items = [];
        for (let i = 1; i <= limit; i++) {
            items.push({
                id: i,
                name: `Supplier ${i}`,
                contactNumber: `555-000${i}`,
                address: `Address ${i}`,
                shop_id: 'default',
                created_at: new Date().toISOString()
            });
        }
        return items;
    },
    async createSupplier(data) {
        return { id: Date.now(), ...data, shop_id: 'default', created_at: new Date().toISOString() };
    },
    async searchSuppliers() { return this.getSuppliers(); },
    async updateSupplier(id, data) { return { id, ...data }; },
    async deleteSupplier() { return true; },
    async getExpenditures() {
        return [{
                id: 1,
                amount: '1000',
                description: 'Sample expense',
                category: 'general',
                paymentMethod: 'cash',
                shop_id: 'default',
                created_at: new Date().toISOString()
            }];
    },
    async createExpenditure(data) {
        return { id: Date.now(), ...data, shop_id: 'default', created_at: new Date().toISOString() };
    },
    async updateExpenditure(id, data) { return { id, ...data }; },
    async deleteExpenditure() { return true; },
    async getGroupedExpenditures() {
        return [{
                id: 1,
                providerName: 'Utility Co',
                category: 'utilities',
                totalAmount: '2000',
                description: 'Monthly bill',
                status: 'pending',
                shop_id: 'default',
                created_at: new Date().toISOString()
            }];
    },
    async createGroupedExpenditure(data) {
        return { id: Date.now(), ...data, shop_id: 'default', created_at: new Date().toISOString() };
    },
    async updateGroupedExpenditure(id, data) { return { id, ...data }; },
    async deleteGroupedExpenditure() { return true; },
    async getBills() { return []; },
    async createBill(data) { return { id: Date.now(), ...data, created_at: new Date().toISOString() }; },
    async getTodayStats() {
        return { totalRevenue: 2500, totalTransactions: 5, revenue: 2500, profit: 500 };
    },
    async getWeekStats() {
        return { totalRevenue: 15000, totalTransactions: 28, revenue: 15000, profit: 3000 };
    },
    async getMonthStats() {
        return { totalRevenue: 45000, totalTransactions: 95, revenue: 45000, profit: 9000 };
    },
    async getYearStats() {
        return { totalRevenue: 540000, totalTransactions: 1200, revenue: 540000, profit: 108000 };
    },
    async getDashboardTotals() {
        return {
            totalRevenue: 45000, totalTransactions: 95, totalSuppliers: 15,
            totalExpenditures: 8500, totalProfit: 36500, totalCustomers: 95,
            totalBills: 0, totalInventory: 0, totalPurchaseOrders: 0
        };
    },
    async getDashboardStats() {
        return {
            weekly: { totalRevenue: 15000, totalTransactions: 28 },
            monthly: { totalRevenue: 45000, totalTransactions: 95 },
            today: { totalRevenue: 2500, totalTransactions: 5 }
        };
    },
    async getReports() {
        return [{ id: 1, name: 'Sales Report', type: 'sales', created_at: new Date().toISOString() }];
    },
    async getRecentTransactions(limit = 5) { return this.getTransactions(limit); },
    async getUserSettings() { return { theme: 'light', notifications: true }; },
    async getSettings() { return [{ theme: 'light', notifications: true }]; },
    async getPermissions() { return { canCreate: true, canEdit: true, canView: true }; },
    async getActivityLog() { return []; },
    async getNotifications() { return []; },
    async getPurchaseOrders() { return []; },
    async getSupplierPayments() { return []; },
    async getTransaction() { return (await this.getTransactions(1))[0]; },
    async getSupplier() { return (await this.getSuppliers(1))[0]; },
    async getExpenditure() { return (await this.getExpenditures())[0]; },
    async getGroupedExpenditure() { return (await this.getGroupedExpenditures())[0]; }
};
module.exports = { storage };
//# sourceMappingURL=storage.js.map