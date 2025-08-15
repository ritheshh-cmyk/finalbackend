"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = 'https://rlmebwbzqmoxqevmzddp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbWVid2J6cW1veHFldm16ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxOTczNjEsImV4cCI6MjA0OTc3MzM2MX0.fQnEzf1r8PpAOqTmBsVULIyLBvGFbC1SU1VJOKhW_J8';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
class DatabaseStorage {
    async getUserById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at')
                .eq('id', id)
                .single();
            if (error || !data)
                return null;
            return data;
        }
        catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }
    async getUserByUsername(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at')
                .eq('username', username)
                .single();
            if (error || !data)
                return null;
            return data;
        }
        catch (error) {
            console.error('Error getting user by username:', error);
            return null;
        }
    }
    async getUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at');
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }
    async createUser(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert(userData)
                .select('id, username, role, shop_id, created_at')
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating user:', error);
            return null;
        }
    }
    async getTransactions() {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    }
    async createTransaction(transactionData) {
        try {
            const externalCost = transactionData.externalItemCost || 0;
            const internalCost = transactionData.internalCost || 0;
            let partsCost = 0;
            if (transactionData.partsCost) {
                if (Array.isArray(transactionData.partsCost)) {
                    partsCost = transactionData.partsCost.reduce((total, part) => total + (part.cost || 0), 0);
                }
                else if (typeof transactionData.partsCost === 'number') {
                    partsCost = transactionData.partsCost;
                }
                else if (typeof transactionData.partsCost === 'string') {
                    partsCost = parseFloat(transactionData.partsCost) || 0;
                }
            }
            const serviceCost = transactionData.repairServiceType === 'external' ? externalCost : internalCost;
            const actualCost = serviceCost + partsCost;
            const profit = transactionData.amountGiven - actualCost;
            const transactionWithProfit = {
                ...transactionData,
                actual_cost: actualCost,
                profit: profit
            };
            const { data, error } = await supabase
                .from('transactions')
                .insert(transactionWithProfit)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }
    async getSuppliers() {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting suppliers:', error);
            return [];
        }
    }
    async createSupplier(supplierData) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .insert(supplierData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    }
    async getBills(limit, offset) {
        try {
            let query = supabase
                .from('bills')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit) {
                query = query.limit(limit);
            }
            if (offset) {
                query = query.range(offset, offset + (limit || 50) - 1);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting bills:', error);
            return [];
        }
    }
    async createBill(billData) {
        try {
            const { data, error } = await supabase
                .from('bills')
                .insert(billData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating bill:', error);
            throw error;
        }
    }
    async getExpenditures(limit, offset) {
        try {
            let query = supabase
                .from('expenditures')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit) {
                query = query.limit(limit);
            }
            if (offset) {
                query = query.range(offset, offset + (limit || 50) - 1);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting expenditures:', error);
            return [];
        }
    }
    async createExpenditure(expenditureData) {
        try {
            const dbData = {
                description: expenditureData.description,
                amount: expenditureData.amount,
                category: expenditureData.category,
                payment_method: expenditureData.paymentMethod,
                recipient: expenditureData.recipient,
                items: expenditureData.items,
                paid_amount: expenditureData.paidAmount || 0,
                remaining_amount: expenditureData.remainingAmount || 0,
                shop_id: expenditureData.shopId || 'default'
            };
            const { data, error } = await supabase
                .from('expenditures')
                .insert(dbData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating expenditure:', error);
            throw error;
        }
    }
    async getGroupedExpenditures(limit, offset) {
        try {
            let query = supabase
                .from('grouped_expenditures')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit) {
                query = query.limit(limit);
            }
            if (offset) {
                query = query.range(offset, offset + (limit || 50) - 1);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting grouped expenditures:', error);
            return [];
        }
    }
    async createGroupedExpenditure(expenditureData) {
        try {
            const dbData = {
                provider_name: expenditureData.providerName,
                category: expenditureData.category,
                total_amount: expenditureData.totalAmount,
                period_start: expenditureData.periodStart,
                period_end: expenditureData.periodEnd,
                description: expenditureData.description,
                status: expenditureData.status || 'pending',
                shop_id: expenditureData.shopId || 'default'
            };
            const { data, error } = await supabase
                .from('grouped_expenditures')
                .insert(dbData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating grouped expenditure:', error);
            throw error;
        }
    }
    async getSupplierPayments(supplierId) {
        try {
            return [];
        }
        catch (error) {
            console.error('Error getting supplier payments:', error);
            return [];
        }
    }
    async getPurchaseOrders(limit, offset) {
        try {
            return [];
        }
        catch (error) {
            console.error('Error getting purchase orders:', error);
            return [];
        }
    }
    async getTodayStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost')
                .gte('created_at', today + 'T00:00:00.000Z')
                .lt('created_at', today + 'T23:59:59.999Z');
            if (error)
                throw error;
            const count = transactions.length;
            const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
            return { transactions: count, revenue };
        }
        catch (error) {
            console.error('Error getting today stats:', error);
            return { transactions: 0, revenue: 0 };
        }
    }
    async getWeekStats() {
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost')
                .gte('created_at', weekAgo.toISOString());
            if (error)
                throw error;
            const count = transactions.length;
            const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
            return { transactions: count, revenue };
        }
        catch (error) {
            console.error('Error getting week stats:', error);
            return { transactions: 0, revenue: 0 };
        }
    }
    async getMonthStats() {
        try {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost')
                .gte('created_at', monthAgo.toISOString());
            if (error)
                throw error;
            const count = transactions.length;
            const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
            return { transactions: count, revenue };
        }
        catch (error) {
            console.error('Error getting month stats:', error);
            return { transactions: 0, revenue: 0 };
        }
    }
    async getYearStats() {
        try {
            const yearAgo = new Date();
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost')
                .gte('created_at', yearAgo.toISOString());
            if (error)
                throw error;
            const count = transactions.length;
            const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
            return { transactions: count, revenue };
        }
        catch (error) {
            console.error('Error getting year stats:', error);
            return { transactions: 0, revenue: 0 };
        }
    }
    async getDashboardTotals() {
        try {
            const [transactions, suppliers, bills] = await Promise.all([
                this.getTransactions(),
                this.getSuppliers(),
                this.getBills()
            ]);
            const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
            const totalProfit = transactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
            return {
                totalTransactions: transactions.length,
                totalRevenue,
                totalProfit,
                totalSuppliers: suppliers.length,
                totalBills: bills.length,
                totalUsers: 1,
                avgTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0,
                completedTransactions: transactions.filter(t => t.status === 'completed').length,
                pendingTransactions: transactions.filter(t => t.status === 'pending').length
            };
        }
        catch (error) {
            console.error('Error getting dashboard totals:', error);
            return {
                totalTransactions: 0,
                totalRevenue: 0,
                totalProfit: 0,
                totalSuppliers: 0,
                totalBills: 0,
                totalUsers: 0,
                avgTransactionValue: 0,
                completedTransactions: 0,
                pendingTransactions: 0
            };
        }
    }
    async getRecentTransactions(limit = 5) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting recent transactions:', error);
            return [];
        }
    }
    async getAllReports() {
        try {
            return [
                { id: 1, name: 'Daily Sales Report', type: 'sales', created_at: new Date() },
                { id: 2, name: 'Weekly Revenue Report', type: 'revenue', created_at: new Date() },
                { id: 3, name: 'Monthly Summary Report', type: 'summary', created_at: new Date() },
                { id: 4, name: 'Supplier Analysis Report', type: 'supplier', created_at: new Date() },
                { id: 5, name: 'Transaction History Report', type: 'transaction', created_at: new Date() },
                { id: 6, name: 'Profit Margin Report', type: 'profit', created_at: new Date() }
            ];
        }
        catch (error) {
            console.error('Error getting reports:', error);
            return [];
        }
    }
    async getTransactionReportsByRange(range) {
        try {
            let startDate;
            const now = new Date();
            switch (range) {
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
                    startDate = new Date(0);
            }
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error(`Error getting ${range} transaction reports:`, error);
            return [];
        }
    }
    async getUserSettings() {
        return { notifications: true, theme: 'light', language: 'en' };
    }
    async getAllPermissions() {
        return { permissions: ['read', 'write', 'admin'] };
    }
    async getNotifications() {
        return { notifications: [] };
    }
    async getActivityLog() {
        return [];
    }
    async updateUser(id, data) {
        return null;
    }
    async deleteUser(id) {
        return false;
    }
    async searchSuppliers(query) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .ilike('name', `%${query}%`);
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error searching suppliers:', error);
            return [];
        }
    }
}
exports.storage = new DatabaseStorage();
exports.default = exports.storage;
//# sourceMappingURL=storage-clean.js.map