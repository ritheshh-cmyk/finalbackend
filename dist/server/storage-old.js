"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const bcrypt = __importStar(require("bcryptjs"));
const createSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://rlmebwbzqmoxqevmzddp.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbWVid2J6cW1veHFldm16ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxOTczNjEsImV4cCI6MjA0OTc3MzM2MX0.fQnEzf1r8PpAOqTmBsVULIyLBvGFbC1SU1VJOKhW_J8';
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });
};
async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error?.message || error);
            if (attempt === maxRetries)
                break;
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
    throw lastError;
}
const supabase = createSupabaseClient();
class DatabaseStorage {
    async getUserByUsername(username) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return data;
        });
    }
    async getUserById(id) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return data;
        });
    }
    async createUser(data) {
        return withRetry(async () => {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const { data: userData, error } = await supabase
                .from('users')
                .insert({
                username: data.username,
                password: hashedPassword,
                role: data.role || 'worker',
                shop_id: data.shop_id || ''
            })
                .select('id, username, role, shop_id, created_at')
                .single();
            if (error)
                throw error;
            return userData;
        });
    }
    async getAllUsers() {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at');
            if (error)
                throw error;
            return (data || []);
        });
    }
    async updateUser(id, data) {
        return withRetry(async () => {
            const updateData = { ...data };
            if (data.password) {
                updateData.password = await bcrypt.hash(data.password, 10);
            }
            const { data: userData, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select('id, username, role, shop_id, created_at')
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw error;
            }
            return userData;
        });
    }
    async deleteUser(id) {
        return withRetry(async () => {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            return true;
        });
    }
    async getTransactions(limit, offset) {
        return withRetry(async () => {
            let query = supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit)
                query = query.limit(limit);
            if (offset)
                query = query.range(offset, offset + (limit || 50) - 1);
            const { data, error } = await query;
            if (error)
                throw error;
            return (data || []);
        });
    }
    async searchTransactions(query) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .ilike('customerName', `%${query}%`)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return (data || []);
        });
    }
    async createTransaction(data) {
        return withRetry(async () => {
            const { data: transaction, error } = await supabase
                .from('transactions')
                .insert(data)
                .select('*')
                .single();
            if (error)
                throw error;
            return transaction;
        });
    }
    async getSuppliers() {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name', { ascending: true });
            if (error)
                throw error;
            return (data || []);
        });
    }
    async createSupplier(data) {
        return withRetry(async () => {
            const { data: supplier, error } = await supabase
                .from('suppliers')
                .insert(data)
                .select('*')
                .single();
            if (error)
                throw error;
            return supplier;
        });
    }
    async getExpenditures(limit, offset) {
        return withRetry(async () => {
            let query = supabase
                .from('expenditures')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit)
                query = query.limit(limit);
            if (offset)
                query = query.range(offset, offset + (limit || 50) - 1);
            const { data, error } = await query;
            if (error)
                throw error;
            return (data || []);
        });
    }
    async createExpenditure(data) {
        return withRetry(async () => {
            const { data: expenditure, error } = await supabase
                .from('expenditures')
                .insert(data)
                .select('*')
                .single();
            if (error)
                throw error;
            return expenditure;
        });
    }
    async getGroupedExpenditures(limit, offset) {
        return withRetry(async () => {
            let query = supabase
                .from('grouped_expenditures')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit)
                query = query.limit(limit);
            if (offset)
                query = query.range(offset, offset + (limit || 50) - 1);
            const { data, error } = await query;
            if (error)
                throw error;
            return (data || []);
        });
    }
    async createGroupedExpenditure(data) {
        return withRetry(async () => {
            const { data: expenditure, error } = await supabase
                .from('grouped_expenditures')
                .insert(data)
                .select('*')
                .single();
            if (error)
                throw error;
            return expenditure;
        });
    }
    async getPurchaseOrders(limit, offset) {
        return withRetry(async () => {
            let query = supabase
                .from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (limit)
                query = query.limit(limit);
            if (offset)
                query = query.range(offset, offset + (limit || 50) - 1);
            const { data, error } = await query;
            if (error)
                throw error;
            return (data || []);
        });
    }
    async getSupplierPayments(supplierId) {
        return withRetry(async () => {
            let query = supabase
                .from('supplier_payments')
                .select('*')
                .order('created_at', { ascending: false });
            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return (data || []);
        });
    }
    async getTodayStats() {
        return withRetry(async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('transactions')
                .select('repairCost, amountGiven')
                .gte('created_at', `${today}T00:00:00`)
                .lt('created_at', `${today}T23:59:59`);
            if (error)
                throw error;
            const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const totalTransactions = (data || []).length;
            return { totalRevenue, totalTransactions };
        });
    }
    async getWeekStats() {
        return withRetry(async () => {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const { data, error } = await supabase
                .from('transactions')
                .select('repairCost, amountGiven')
                .gte('created_at', weekAgo.toISOString());
            if (error)
                throw error;
            const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const totalTransactions = (data || []).length;
            return { totalRevenue, totalTransactions };
        });
    }
    async getMonthStats() {
        return withRetry(async () => {
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const { data, error } = await supabase
                .from('transactions')
                .select('repairCost, amountGiven')
                .gte('created_at', monthAgo.toISOString());
            if (error)
                throw error;
            const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const totalTransactions = (data || []).length;
            return { totalRevenue, totalTransactions };
        });
    }
    async getYearStats() {
        return withRetry(async () => {
            const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            const { data, error } = await supabase
                .from('transactions')
                .select('repairCost, amountGiven')
                .gte('created_at', yearAgo.toISOString());
            if (error)
                throw error;
            const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const totalTransactions = (data || []).length;
            return { totalRevenue, totalTransactions };
        });
    }
    async getDashboardTotals() {
        return withRetry(async () => {
            const [transactionsResult, suppliersResult, expendituresResult] = await Promise.allSettled([
                supabase.from('transactions').select('repairCost, amountGiven'),
                supabase.from('suppliers').select('id'),
                supabase.from('expenditures').select('amount')
            ]);
            const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value.data || [] : [];
            const suppliers = suppliersResult.status === 'fulfilled' ? suppliersResult.value.data || [] : [];
            const expenditures = expendituresResult.status === 'fulfilled' ? expendituresResult.value.data || [] : [];
            const totalRevenue = transactions.reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const totalTransactions = transactions.length;
            const totalSuppliers = suppliers.length;
            const totalExpenditures = expenditures.reduce((sum, e) => sum + (e.amount || 0), 0);
            return {
                totalRevenue,
                totalTransactions,
                totalSuppliers,
                totalExpenditures,
                totalProfit: totalRevenue - totalExpenditures,
                totalCustomers: totalTransactions,
                totalBills: 0,
                totalInventory: 0,
                totalPurchaseOrders: 0
            };
        });
    }
    async getDashboardStats() {
        return withRetry(async () => {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            const [weeklyResult, monthlyResult, todayResult] = await Promise.allSettled([
                this.getWeekStats(),
                this.getMonthStats(),
                this.getTodayStats()
            ]);
            return {
                weekly: weeklyResult.status === 'fulfilled' ? weeklyResult.value : { totalRevenue: 0, totalTransactions: 0 },
                monthly: monthlyResult.status === 'fulfilled' ? monthlyResult.value : { totalRevenue: 0, totalTransactions: 0 },
                today: todayResult.status === 'fulfilled' ? todayResult.value : { totalRevenue: 0, totalTransactions: 0 }
            };
        });
    }
    async getBills(limit, offset) {
        return [];
    }
    async createBill(data) {
        return { id: Date.now(), ...data, created_at: new Date().toISOString() };
    }
    async getReports() {
        return withRetry(async () => {
            const reports = [
                { id: 1, name: 'Daily Sales Report', type: 'sales', created_at: new Date().toISOString() },
                { id: 2, name: 'Weekly Revenue Report', type: 'revenue', created_at: new Date().toISOString() },
                { id: 3, name: 'Monthly Transactions Report', type: 'transactions', created_at: new Date().toISOString() },
                { id: 4, name: 'Supplier Performance Report', type: 'suppliers', created_at: new Date().toISOString() },
                { id: 5, name: 'Expenditure Analysis Report', type: 'expenditures', created_at: new Date().toISOString() },
                { id: 6, name: 'Profit & Loss Report', type: 'financial', created_at: new Date().toISOString() }
            ];
            return reports;
        });
    }
    async getTransactionReports(period) {
        return withRetry(async () => {
            let startDate;
            const now = new Date();
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
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        });
    }
    async getRecentTransactions(limit = 5) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return data || [];
        });
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
exports.DatabaseStorage = DatabaseStorage;
exports.storage = new DatabaseStorage();
//# sourceMappingURL=storage-old.js.map