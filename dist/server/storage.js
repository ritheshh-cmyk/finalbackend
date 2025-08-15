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
exports.storage = void 0;
exports.ensureDefaultUser = ensureDefaultUser;
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
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || 'https://pxvtfywumekpdtablcjq.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiss3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dnRmeXd1bWVrcGR0YWJsY2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMzOTYwNiwiZXhwIjoyMDY5OTE1NjA2fQ.N_nUTBI89ydKXQ2OWhrxz-AvnqNqjF35i_CPHUIC790');
const PRODUCTION_BYPASS = process.env.NODE_ENV === 'production' ||
    process.env.BYPASS_DATABASE === 'true' ||
    process.env.PORT === '10000' ||
    process.env.VERCEL === '1';
async function executeWithRetry(queryFn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await queryFn();
        }
        catch (error) {
            console.error(`❌ Database query attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) {
                throw error;
            }
            if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' ||
                error.code === 'XX000' || error.message.includes('connection') ||
                error.message.includes('termination') || error.message.includes('db_termination')) {
                console.log(`🔄 Retrying database query in ${attempt * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
            else {
                throw error;
            }
        }
    }
}
async function safeDatabaseOperation(operation) {
    try {
        return await executeWithRetry(operation);
    }
    catch (error) {
        console.error('❌ Database operation failed after retries:', error.message);
        if (error.message?.includes('db_termination') || error.code === 'XX000') {
            console.log('⚠️ Database connection issue detected, returning null');
            return null;
        }
        throw error;
    }
}
class DatabaseStorage {
    async getUserByUsername(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            if (error)
                return null;
            return data;
        }
        catch (error) {
            console.error('Error getting user by username:', error);
            return null;
        }
    }
    async getUserById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at')
                .eq('id', id)
                .single();
            if (error)
                return null;
            return data;
        }
        catch (error) {
            return null;
        }
    }
    async createUser(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const { data: userData, error } = await supabase
            .from('users')
            .insert({
            username: data.username,
            password: hashedPassword,
            role: data.role || 'worker',
            shop_id: data.shop_id || 'default'
        })
            .select('id, username, role, shop_id, created_at')
            .single();
        if (error)
            throw error;
        return userData;
    }
    async getAllUsers() {
        if (PRODUCTION_BYPASS) {
            return [
                {
                    id: 1,
                    username: 'admin',
                    role: 'admin',
                    shop_id: 'default',
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    username: 'worker',
                    role: 'worker',
                    shop_id: 'default',
                    created_at: new Date().toISOString()
                }
            ];
        }
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, role, shop_id, created_at');
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }
    async updateUser(id, data) {
        try {
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
            if (error)
                return null;
            return userData;
        }
        catch (error) {
            return null;
        }
    }
    async deleteUser(id) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);
            return !error;
        }
        catch (error) {
            return false;
        }
    }
    async getTodayStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('repair_cost, profit, amount_given')
                .gte('created_at', today + 'T00:00:00.000Z')
                .lt('created_at', today + 'T23:59:59.999Z');
            const { data: bills, error: billError } = await supabase
                .from('bills')
                .select('final_amount')
                .gte('created_at', today + 'T00:00:00.000Z')
                .lt('created_at', today + 'T23:59:59.999Z');
            const txCount = transactions?.length || 0;
            const revenue = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0) || 0;
            const profit = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0) || 0;
            const billsTotal = bills?.reduce((sum, bill) => sum + (parseFloat(bill.final_amount) || 0), 0) || 0;
            return {
                transactions: txCount,
                revenue,
                profit,
                bills: bills?.length || 0,
                billsTotal
            };
        }
        catch (error) {
            console.error('Error getting today stats:', error);
            throw error;
        }
    }
    async getWeekStats() {
        try {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost, profit, amount_given')
                .gte('created_at', weekAgo);
            const count = transactions?.length || 0;
            const revenue = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0) || 0;
            const profit = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0) || 0;
            return { transactions: count, revenue, profit };
        }
        catch (error) {
            console.error('Error getting week stats:', error);
            throw error;
        }
    }
    async getMonthStats() {
        try {
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost, profit, amount_given')
                .gte('created_at', monthAgo);
            const count = transactions?.length || 0;
            const revenue = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0) || 0;
            const profit = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0) || 0;
            return { transactions: count, revenue, profit };
        }
        catch (error) {
            console.error('Error getting month stats:', error);
            throw error;
        }
    }
    async getYearStats() {
        try {
            const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('repair_cost, profit, amount_given')
                .gte('created_at', yearAgo);
            const count = transactions?.length || 0;
            const revenue = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0) || 0;
            const profit = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0) || 0;
            return { transactions: count, revenue, profit };
        }
        catch (error) {
            console.error('Error getting year stats:', error);
            throw error;
        }
    }
    async getDashboardTotals() {
        try {
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('repair_cost, profit, amount_given, created_at');
            const { data: bills, error: billError } = await supabase
                .from('bills')
                .select('final_amount, payment_status');
            const { data: inventory, error: invError } = await supabase
                .from('inventory')
                .select('quantity_in_stock, minimum_stock_level');
            const today = new Date().toISOString().split('T')[0];
            const todayTx = transactions?.filter(tx => tx.created_at.startsWith(today)) || [];
            const totalRevenue = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0) || 0;
            const totalProfit = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0) || 0;
            const todayRevenue = todayTx.reduce((sum, tx) => sum + (parseFloat(tx.amount_given) || 0), 0);
            const todayProfit = todayTx.reduce((sum, tx) => sum + (parseFloat(tx.profit) || 0), 0);
            const unpaidBills = bills?.filter(bill => bill.payment_status === 'pending').length || 0;
            const lowStockItems = inventory?.filter(item => (item.quantity_in_stock || 0) <= (item.minimum_stock_level || 5)).length || 0;
            return {
                totalTransactions: transactions?.length || 0,
                totalRevenue,
                totalProfit,
                todayRevenue,
                todayProfit,
                pendingTransactions: todayTx.length,
                totalBills: bills?.length || 0,
                unpaidBills,
                lowStockItems
            };
        }
        catch (error) {
            console.error('Error getting dashboard totals:', error);
            throw error;
        }
    }
    async getWeeklyStatistics() {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('amount_given, profit, created_at')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
            if (error)
                throw error;
            const dayMap = new Map();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            transactions?.forEach(tx => {
                const date = new Date(tx.created_at);
                const dayName = days[date.getDay()];
                if (!dayMap.has(dayName)) {
                    dayMap.set(dayName, { day: dayName, revenue: 0, profit: 0, transactions: 0 });
                }
                const dayData = dayMap.get(dayName);
                dayData.revenue += parseFloat(tx.amount_given) || 0;
                dayData.profit += parseFloat(tx.profit) || 0;
                dayData.transactions += 1;
            });
            return days.map(day => dayMap.get(day) || { day, revenue: 0, profit: 0, transactions: 0 });
        }
        catch (error) {
            console.error('Error getting weekly statistics:', error);
            throw error;
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
            return [];
        }
    }
    async getTopSuppliers(limit = 5) {
        try {
            const { data: suppliers, error: suppliersError } = await supabase
                .from('suppliers')
                .select('*');
            const { data: payments, error: paymentsError } = await supabase
                .from('supplier_payments')
                .select('supplier_id, amount');
            if (suppliersError || paymentsError)
                return [];
            const supplierTotals = suppliers?.map(supplier => {
                const supplierPayments = payments?.filter(p => p.supplier_id === supplier.id) || [];
                const totalPaid = supplierPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                return {
                    ...supplier,
                    payment_count: supplierPayments.length,
                    total_paid: totalPaid
                };
            }) || [];
            return supplierTotals
                .sort((a, b) => b.total_paid - a.total_paid)
                .slice(0, limit);
        }
        catch (error) {
            return [];
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
            throw error;
        }
    }
    async getExpenditures(limit, offset) {
        if (PRODUCTION_BYPASS) {
            return [
                {
                    id: 1,
                    supplier_id: 1,
                    amount: 1000,
                    description: 'Sample expenditure',
                    category: 'general',
                    payment_method: 'cash',
                    payment_status: 'paid',
                    due_date: null,
                    shop_id: 'default',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
        }
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
            throw error;
        }
    }
    async getSupplierPayments(supplierId) {
        try {
            return [];
        }
        catch (error) {
            console.error('Error getting supplier payments:', error);
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
            throw error;
        }
    }
    async getPurchaseOrders(limit, offset) {
        try {
            return [];
        }
        catch (error) {
            console.error('Error getting purchase orders:', error);
            throw error;
        }
    }
    async getNotifications(userId) {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });
            if (userId) {
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }
    async getUserSettings(userId) {
        try {
            let query = supabase
                .from('settings')
                .select('*')
                .order('setting_key');
            if (userId) {
                query = query.or(`user_id.eq.${userId},setting_type.eq.system`);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting user settings:', error);
            return [];
        }
    }
    async getActivityLog(userId) {
        try {
            let query = supabase
                .from('activity_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting activity log:', error);
            return [];
        }
    }
    async searchTransactions(query) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .or(`customer_name.ilike.%${query}%,mobile_number.ilike.%${query}%,device_model.ilike.%${query}%`)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            return [];
        }
    }
    async searchSuppliers(query) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .or(`name.ilike.%${query}%,contact_number.ilike.%${query}%,address.ilike.%${query}%`)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            return [];
        }
    }
    async searchInventory(query) {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
                .order('name');
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            return [];
        }
    }
    async getAllPermissions() {
        try {
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .order('role', { ascending: true })
                .order('resource', { ascending: true });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting permissions:', error);
            return [];
        }
    }
    async getAllReports() {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting reports:', error);
            return [];
        }
    }
    async getReportsByDateRange(dateRange) {
        try {
            const today = new Date();
            let startDate;
            let endDate = new Date();
            switch (dateRange) {
                case "today":
                    startDate = new Date(today);
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case "week":
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    break;
                case "month":
                    startDate = new Date(today);
                    startDate.setMonth(today.getMonth() - 1);
                    break;
                default:
                    startDate = new Date(0);
            }
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            return [];
        }
    }
    async createTransaction(data) {
        console.log('🔄 Creating transaction in database:', data);
        const externalCost = data.externalItemCost || 0;
        const internalCost = data.internalCost || 0;
        let partsCost = 0;
        if (data.partsCost) {
            if (Array.isArray(data.partsCost)) {
                partsCost = data.partsCost.reduce((total, part) => total + (part.cost || 0), 0);
            }
            else if (typeof data.partsCost === 'number') {
                partsCost = data.partsCost;
            }
            else if (typeof data.partsCost === 'string') {
                partsCost = parseFloat(data.partsCost) || 0;
            }
        }
        const serviceCost = data.repairServiceType === 'external' ? externalCost : internalCost;
        const actualCost = serviceCost + partsCost;
        const profit = data.amountGiven - actualCost;
        console.log('📊 Transaction calculations:', {
            externalCost,
            internalCost,
            partsCost,
            serviceCost,
            actualCost,
            profit
        });
        const result = await executeWithRetry(async () => {
            return await sql(`INSERT INTO transactions (
          customer_name, mobile_number, device_model, repair_type, repair_cost, payment_method, 
          amount_given, change_returned, status, remarks, parts_cost, free_glass_installation, requires_inventory,
          external_item_cost, internal_cost, actual_cost, profit, repair_service_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`, [
                data.customerName, data.mobileNumber, data.deviceModel, data.repairType,
                Number(data.repairCost), data.paymentMethod, Number(data.amountGiven), Number(data.changeReturned),
                data.status || 'Completed', data.remarks || null,
                Number(partsCost), data.freeGlassInstallation || false, data.requiresInventory || false,
                Number(externalCost), Number(internalCost), Number(actualCost), Number(profit), data.repairServiceType || 'internal'
            ]);
        });
        console.log('✅ Transaction created successfully:', result[0]);
        return result[0];
    }
    async getTransaction(id) {
        const result = await sql('SELECT * FROM transactions WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async getTransactions(limit, offset) {
        if (limit && offset !== undefined) {
            const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
            return result;
        }
        const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC');
        return result;
    }
    async getTransactionsByDateRange(startDate, endDate) {
        const result = await sql('SELECT * FROM transactions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC', [startDate.toISOString(), endDate.toISOString()]);
        return result;
    }
    async updateTransaction(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getTransaction(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE transactions SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteTransaction(id) {
        const result = await sql('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async searchTransactionsByDateRange(startDate, endDate) {
        const result = await sql('SELECT * FROM transactions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC', [startDate, endDate]);
        return result;
    }
    async createSupplier(data) {
        const result = await sql('INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3) RETURNING *', [data.name, data.contactNumber || null, data.address || null]);
        return result[0];
    }
    async getSupplier(id) {
        const result = await sql('SELECT * FROM suppliers WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async getSuppliers(limit, offset) {
        if (limit && offset !== undefined) {
            const result = await sql('SELECT * FROM suppliers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
            return result;
        }
        const result = await sql('SELECT * FROM suppliers ORDER BY created_at DESC');
        return result;
    }
    async searchSuppliers(query) {
        const result = await sql(`SELECT * FROM suppliers 
       WHERE name ILIKE $1 
       OR contact ILIKE $1 
       OR address ILIKE $1 
       ORDER BY created_at DESC`, [`%${query}%`]);
        return result;
    }
    async updateSupplier(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getSupplier(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE suppliers SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteSupplier(id) {
        const result = await sql('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async updateUser(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getUserById(id);
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, username, role, shop_id, created_at as "createdAt"`, values);
        return result.length ? result[0] : null;
    }
    async deleteUser(id) {
        const result = await sql('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createSupplierPayment(data) {
        const result = await sql('INSERT INTO supplier_payments (supplier_id, amount, payment_method, description) VALUES ($1, $2, $3, $4) RETURNING *', [data.supplierId, data.amount, data.paymentMethod, data.description || null]);
        return result[0];
    }
    async getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = await sql('SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE DATE(created_at) = $1', [today]);
        const todayBills = await sql('SELECT COUNT(*) as count, SUM(final_amount) as total FROM bills WHERE DATE(created_at) = $1', [today]);
        return {
            transactions: todayTransactions[0]?.count || 0,
            revenue: todayTransactions[0]?.revenue || 0,
            bills: todayBills[0]?.count || 0,
            billsTotal: todayBills[0]?.total || 0
        };
    }
    async getWeekStats() {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const weekTransactions = await sql('SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1', [weekAgo]);
        return {
            transactions: weekTransactions[0]?.count || 0,
            revenue: weekTransactions[0]?.revenue || 0
        };
    }
    async getMonthStats() {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const monthTransactions = await sql('SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1', [monthAgo]);
        return {
            transactions: monthTransactions[0]?.count || 0,
            revenue: monthTransactions[0]?.revenue || 0
        };
    }
    async getYearStats() {
        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const yearTransactions = await sql('SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1', [yearAgo]);
        return {
            transactions: yearTransactions[0]?.count || 0,
            revenue: yearTransactions[0]?.revenue || 0
        };
    }
    async getSupplierPayments(supplierId) {
        if (supplierId) {
            const result = await sql('SELECT * FROM supplier_payments WHERE supplier_id = $1 ORDER BY created_at DESC', [supplierId]);
            return result;
        }
        const result = await sql('SELECT * FROM supplier_payments ORDER BY created_at DESC');
        return result;
    }
    async getSupplierPayment(id) {
        const result = await sql('SELECT * FROM supplier_payments WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async updateSupplierPayment(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getSupplierPayment(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE supplier_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteSupplierPayment(id) {
        const result = await sql('DELETE FROM supplier_payments WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async getSupplierExpenditureSummary() {
        try {
            const result = await sql(`
        WITH supplier_totals AS (
          SELECT 
            s.id,
            s.name,
            s.contact_number,
            COALESCE(SUM(e.amount), 0) as total_expenditure,
            COALESCE(SUM(sp.amount), 0) as total_paid,
            (COALESCE(SUM(e.amount), 0) - COALESCE(SUM(sp.amount), 0)) as balance_due
          FROM suppliers s
          LEFT JOIN expenditures e ON s.id = e.supplier_id
          LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
          GROUP BY s.id, s.name, s.contact_number
        )
        SELECT 
          id,
          name,
          contact_number,
          total_expenditure,
          total_paid,
          balance_due,
          CASE 
            WHEN balance_due > 0 THEN 'pending'
            WHEN balance_due < 0 THEN 'overpaid'  
            ELSE 'settled'
          END as status
        FROM supplier_totals
        ORDER BY balance_due DESC, name ASC
      `);
            return result;
        }
        catch (error) {
            console.error('Error getting supplier expenditure summary:', error);
            return [];
        }
    }
    async createBill(data) {
        const result = await sql(`INSERT INTO bills (
        customer_name, customer_phone, customer_email, customer_address,
        bill_number, total_amount, tax_amount, discount_amount, final_amount,
        payment_status, payment_method, due_date, notes, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`, [
            data.customerName, data.customerPhone || null, data.customerEmail || null, data.customerAddress || null,
            data.billNumber, data.totalAmount, data.taxAmount || 0, data.discountAmount || 0, data.finalAmount,
            data.paymentStatus || 'pending', data.paymentMethod || null, data.dueDate || null, data.notes || null, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getBill(id) {
        const result = await sql('SELECT * FROM bills WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async getBills(limit, offset) {
        if (limit && offset !== undefined) {
            const result = await sql('SELECT * FROM bills ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
            return result;
        }
        const result = await sql('SELECT * FROM bills ORDER BY created_at DESC');
        return result;
    }
    async getBillsByDateRange(startDate, endDate) {
        const result = await sql('SELECT * FROM bills WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC', [startDate.toISOString(), endDate.toISOString()]);
        return result;
    }
    async searchBills(query) {
        const result = await sql(`SELECT * FROM bills 
       WHERE customer_name ILIKE $1 
       OR bill_number ILIKE $1 
       OR customer_phone ILIKE $1 
       ORDER BY created_at DESC`, [`%${query}%`]);
        return result;
    }
    async updateBill(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getBill(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE bills SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteBill(id) {
        const result = await sql('DELETE FROM bills WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createNotification(data) {
        const result = await sql(`INSERT INTO notifications (
        title, message, type, user_id, priority, action_url, metadata, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [
            data.title, data.message, data.type || 'info', data.userId || null,
            data.priority || 'medium', data.actionUrl || null, JSON.stringify(data.metadata || {}), data.shopId || 'default'
        ]);
        return result[0];
    }
    async getNotifications(userId) {
        if (userId) {
            const result = await sql('SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC', [userId]);
            return result;
        }
        const result = await sql('SELECT * FROM notifications ORDER BY created_at DESC');
        return result;
    }
    async markNotificationAsRead(id) {
        const result = await sql('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *', [id]);
        return result.length ? result[0] : null;
    }
    async deleteNotification(id) {
        const result = await sql('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async searchTransactions(query) {
        const result = await sql(`SELECT * FROM transactions 
       WHERE customer_name ILIKE $1 
       OR mobile_number ILIKE $1 
       OR device_model ILIKE $1 
       ORDER BY created_at DESC`, [`%${query}%`]);
        return result;
    }
    async createInventoryItem(data) {
        const result = await sql(`INSERT INTO inventory_items (
        name, description, category, quantity, unit_price, supplier_id, sku, minimum_stock, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [
            data.name, data.description || null, data.category || null, data.quantity || 0,
            data.unitPrice || 0, data.supplierId || null, data.sku || null, data.minimumStock || 0, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getInventoryItem(id) {
        const result = await sql('SELECT * FROM inventory_items WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async updateInventoryItem(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getInventoryItem(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE inventory_items SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteInventoryItem(id) {
        const result = await sql('DELETE FROM inventory_items WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async searchInventoryItems(query) {
        const result = await sql(`SELECT * FROM inventory_items 
       WHERE name ILIKE $1 
       OR description ILIKE $1 
       OR category ILIKE $1 
       OR sku ILIKE $1 
       ORDER BY name`, [`%${query}%`]);
        return result;
    }
    async searchInventory(query) {
        return this.searchInventoryItems(query);
    }
    async getInventoryItems(limit, offset) {
        if (limit && offset !== undefined) {
            const result = await sql('SELECT * FROM inventory_items ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
            return result;
        }
        const result = await sql('SELECT * FROM inventory_items ORDER BY name');
        return result;
    }
    async getDashboardData() {
        const result = await sql(`
      SELECT 
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COALESCE(SUM(amount_given), 0) FROM transactions) as total_revenue,
        (SELECT COALESCE(SUM(profit), 0) FROM transactions) as total_profit,
        (SELECT COALESCE(SUM(amount_given), 0) FROM transactions WHERE DATE(created_at) = CURRENT_DATE) as today_revenue,
        (SELECT COALESCE(SUM(profit), 0) FROM transactions WHERE DATE(created_at) = CURRENT_DATE) as today_profit,
        (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURRENT_DATE) as pending_transactions,
        (SELECT COUNT(*) FROM bills) as total_bills,
        (SELECT COUNT(*) FROM bills WHERE payment_status = 'pending') as unpaid_bills,
        (SELECT COUNT(*) FROM inventory_items WHERE quantity <= 5) as low_stock_items
    `);
        const data = result[0] || {};
        return {
            totalTransactions: parseInt(data.total_transactions) || 0,
            totalRevenue: parseFloat(data.total_revenue) || 0,
            totalProfit: parseFloat(data.total_profit) || 0,
            todayRevenue: parseFloat(data.today_revenue) || 0,
            todayProfit: parseFloat(data.today_profit) || 0,
            pendingTransactions: parseInt(data.pending_transactions) || 0,
            totalBills: parseInt(data.total_bills) || 0,
            unpaidBills: parseInt(data.unpaid_bills) || 0,
            lowStockItems: parseInt(data.low_stock_items) || 0
        };
    }
    async getDashboardTotals() {
        return this.getDashboardData();
    }
    async getWeeklyStatistics() {
        const result = await sql(`
      SELECT 
        TO_CHAR(created_at, 'Dy') as day,
        COALESCE(SUM(amount_given), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(*) as transactions
      FROM transactions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
      ORDER BY DATE(created_at)
    `);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayMap = new Map();
        result.forEach((row) => {
            dayMap.set(row.day, {
                day: row.day,
                revenue: parseFloat(row.revenue) || 0,
                profit: parseFloat(row.profit) || 0,
                transactions: parseInt(row.transactions) || 0
            });
        });
        return days.map(day => dayMap.get(day) || {
            day,
            revenue: 0,
            profit: 0,
            transactions: 0
        });
    }
    async getRecentTransactions(limit = 5) {
        const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
        return result;
    }
    async getTopSuppliers(limit = 5) {
        const result = await sql(`SELECT s.*, COUNT(sp.id) as payment_count, SUM(sp.amount) as total_paid 
       FROM suppliers s 
       LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id 
       GROUP BY s.id 
       ORDER BY total_paid DESC NULLS LAST 
       LIMIT $1`, [limit]);
        return result;
    }
    async createPurchaseOrder(data) {
        const result = await sql(`INSERT INTO purchase_orders (
        supplier_id, order_number, total_amount, status, expected_delivery, notes, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [
            data.supplierId, data.orderNumber || null, data.totalAmount || 0,
            data.status || 'pending', data.expectedDelivery || null, data.notes || null, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getPurchaseOrder(id) {
        const result = await sql('SELECT * FROM purchase_orders WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async getPurchaseOrders(limit, offset) {
        if (limit && offset !== undefined) {
            const result = await sql('SELECT * FROM purchase_orders ORDER BY order_date DESC LIMIT $1 OFFSET $2', [limit, offset]);
            return result;
        }
        const result = await sql('SELECT * FROM purchase_orders ORDER BY order_date DESC');
        return result;
    }
    async updatePurchaseOrder(id, data) {
        const fields = Object.keys(data);
        if (fields.length === 0)
            return this.getPurchaseOrder(id);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id.toString());
        const result = await sql(`UPDATE purchase_orders SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deletePurchaseOrder(id) {
        const result = await sql('DELETE FROM purchase_orders WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createSetting(data) {
        const result = await sql(`INSERT INTO settings (
        user_id, setting_key, setting_value, setting_type, description, is_public, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [
            data.userId || null, data.settingKey, JSON.stringify(data.settingValue),
            data.settingType || 'user', data.description || null, data.isPublic || false, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getSettings(userId) {
        if (userId) {
            const result = await sql('SELECT * FROM settings WHERE user_id = $1 OR setting_type = \'system\' ORDER BY setting_key', [userId]);
            return result;
        }
        const result = await sql('SELECT * FROM settings ORDER BY setting_key');
        return result;
    }
    async getUserSettings(userId) {
        return this.getSettings(userId);
    }
    async updateSetting(id, data) {
        const result = await sql('UPDATE settings SET setting_value = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [JSON.stringify(data.settingValue), id]);
        return result.length ? result[0] : null;
    }
    async deleteSetting(id) {
        const result = await sql('DELETE FROM settings WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createActivityLog(data) {
        const result = await sql(`INSERT INTO activity_log (
        user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [
            data.userId || null, data.action, data.entityType, data.entityId || null,
            data.description, JSON.stringify(data.metadata || {}), data.ipAddress || null,
            data.userAgent || null, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getActivityLogs(userId) {
        if (userId) {
            const result = await sql('SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);
            return result;
        }
        const result = await sql('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100');
        return result;
    }
    async getActivityLog(userId) {
        return this.getActivityLogs(userId);
    }
    async getExpenditures(limit = 50, offset = 0) {
        const result = await sql('SELECT * FROM expenditures ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result;
    }
    async getExpenditure(id) {
        const result = await sql('SELECT * FROM expenditures WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async createExpenditure(data) {
        try {
            const { data: expenditure, error } = await supabase
                .from('expenditures')
                .insert([{
                    supplier_id: data.supplierId,
                    amount: data.amount,
                    description: data.description,
                    category: data.category || 'general',
                    payment_method: data.paymentMethod || 'cash',
                    payment_status: data.paymentStatus || 'pending',
                    due_date: data.dueDate || null,
                    shop_id: data.shopId || 'default'
                }])
                .select()
                .single();
            if (error)
                throw error;
            return expenditure;
        }
        catch (error) {
            console.error('Error creating expenditure:', error);
            throw error;
        }
    }
    async updateExpenditure(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.supplierId !== undefined) {
            fields.push(`supplier_id = $${paramIndex++}`);
            values.push(data.supplierId);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${paramIndex++}`);
            values.push(data.amount);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(data.category);
        }
        if (data.paymentMethod !== undefined) {
            fields.push(`payment_method = $${paramIndex++}`);
            values.push(data.paymentMethod);
        }
        if (data.paymentStatus !== undefined) {
            fields.push(`payment_status = $${paramIndex++}`);
            values.push(data.paymentStatus);
        }
        if (data.dueDate !== undefined) {
            fields.push(`due_date = $${paramIndex++}`);
            values.push(data.dueDate);
        }
        if (fields.length === 0)
            return null;
        fields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(id);
        const result = await sql(`UPDATE expenditures SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.length ? result[0] : null;
    }
    async deleteExpenditure(id) {
        const result = await sql('DELETE FROM expenditures WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async getExpendituresByDateRangeForShop(shopId, startDate, endDate) {
        const result = await sql('SELECT * FROM expenditures WHERE shop_id = $1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC', [shopId, startDate.toISOString(), endDate.toISOString()]);
        return result;
    }
    async getPermissions(role) {
        if (role) {
            const result = await sql('SELECT * FROM permissions WHERE role = $1 ORDER BY resource, action', [role]);
            return result;
        }
        const result = await sql('SELECT * FROM permissions ORDER BY role, resource, action');
        return result;
    }
    async getAllPermissions() {
        return this.getPermissions();
    }
    async updatePermission(id, data) {
        const result = await sql('UPDATE permissions SET allowed = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [data.allowed, id]);
        return result.length ? result[0] : null;
    }
    async createGroupedExpenditure(data) {
        try {
            const { data: groupedExpenditure, error } = await supabase
                .from('grouped_expenditures')
                .insert([{
                    provider_name: data.providerName,
                    category: data.category,
                    total_amount: data.totalAmount,
                    period_start: data.periodStart,
                    period_end: data.periodEnd,
                    description: data.description,
                    status: data.status || 'pending',
                    shop_id: data.shopId || 'default'
                }])
                .select()
                .single();
            if (error)
                throw error;
            return groupedExpenditure;
        }
        catch (error) {
            console.error('Error creating grouped expenditure:', error);
            throw error;
        }
    }
    async getGroupedExpenditures(limit = 50, offset = 0) {
        return await sql('SELECT * FROM grouped_expenditures ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    }
    async getGroupedExpenditure(id) {
        const result = await sql('SELECT * FROM grouped_expenditures WHERE id = $1', [id]);
        return result[0];
    }
    async updateGroupedExpenditure(id, data) {
        const result = await sql('UPDATE grouped_expenditures SET provider_name = COALESCE($1, provider_name), category = COALESCE($2, category), total_amount = COALESCE($3, total_amount), period_start = COALESCE($4, period_start), period_end = COALESCE($5, period_end), description = COALESCE($6, description), status = COALESCE($7, status) WHERE id = $8 RETURNING *', [data.provider_name, data.category, data.total_amount, data.period_start, data.period_end, data.description, data.status, id]);
        return result[0];
    }
    async deleteGroupedExpenditure(id) {
        const result = await sql('DELETE FROM grouped_expenditures WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async getGroupedExpendituresByDateRange(startDate, endDate) {
        return await sql('SELECT * FROM grouped_expenditures WHERE period_start >= $1 AND period_end <= $2 ORDER BY created_at DESC', [startDate, endDate]);
    }
    async searchGroupedExpenditures(search) {
        return await sql('SELECT * FROM grouped_expenditures WHERE provider_name ILIKE $1 OR category ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC', [`%${search}%`]);
    }
    async createGroupedExpenditurePayment(data) {
        const result = await sql('INSERT INTO grouped_expenditure_payments (grouped_expenditure_id, amount, payment_method, payment_date, description, shop_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [data.grouped_expenditure_id, data.amount, data.payment_method, data.payment_date || new Date(), data.description, data.shop_id || 'default']);
        return result[0];
    }
    async getGroupedExpenditurePayments(groupedExpenditureId) {
        return await sql('SELECT * FROM grouped_expenditure_payments WHERE grouped_expenditure_id = $1 ORDER BY payment_date DESC', [groupedExpenditureId]);
    }
    async deleteGroupedExpenditurePayment(id) {
        const result = await sql('DELETE FROM grouped_expenditure_payments WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createReport(data) {
        const result = await sql(`INSERT INTO reports (
        name, type, description, parameters, generated_by, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [
            data.name, data.type, data.description || null, JSON.stringify(data.parameters || {}),
            data.generatedBy || null, data.shopId || 'default'
        ]);
        return result[0];
    }
    async getReports(startDate, endDate) {
        let query = 'SELECT * FROM transactions';
        const params = [];
        if (startDate && endDate) {
            query += ' WHERE created_at BETWEEN $1 AND $2';
            params.push(startDate, endDate);
        }
        query += ' ORDER BY created_at DESC';
        const result = await sql(query, params);
        return result;
    }
    async getAllReports() {
        const result = await sql('SELECT * FROM reports ORDER BY created_at DESC');
        return result;
    }
    async getReportsByDateRange(dateRange) {
        const today = new Date();
        let startDate;
        let endDate = new Date();
        switch (dateRange) {
            case "today":
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case "week":
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case "month":
                startDate = new Date(today);
                startDate.setMonth(today.getMonth() - 1);
                break;
            default:
                startDate = new Date(0);
        }
        const result = await sql('SELECT * FROM reports WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC', [startDate.toISOString(), endDate.toISOString()]);
        return result;
    }
    async getReport(id) {
        const result = await sql('SELECT * FROM reports WHERE id = $1', [id]);
        return result.length ? result[0] : null;
    }
    async updateReport(id, data) {
        const result = await sql('UPDATE reports SET data = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *', [JSON.stringify(data.data || {}), data.status || 'completed', id]);
        return result.length ? result[0] : null;
    }
    async deleteReport(id) {
        const result = await sql('DELETE FROM reports WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    async createBill(data) {
        try {
            const { data: bill, error } = await supabase
                .from('bills')
                .insert([{
                    customer_name: data.customerName,
                    customer_phone: data.customerPhone || null,
                    customer_email: data.customerEmail || null,
                    customer_address: data.customerAddress || null,
                    bill_number: data.billNumber,
                    total_amount: data.totalAmount,
                    tax_amount: data.taxAmount || 0,
                    discount_amount: data.discountAmount || 0,
                    final_amount: data.finalAmount,
                    payment_status: data.paymentStatus || 'pending',
                    payment_method: data.paymentMethod || null,
                    due_date: data.dueDate || null,
                    notes: data.notes || null,
                    shop_id: data.shopId || 'default'
                }])
                .select()
                .single();
            if (error)
                throw error;
            return bill;
        }
        catch (error) {
            console.error('Error creating bill:', error);
            throw error;
        }
    }
    async getDashboardData() {
        try {
            const [transactionsStats, billsStats, inventoryStats, recentTransactions] = await Promise.all([
                supabase.from('transactions').select('id, amount_given, profit, created_at'),
                supabase.from('bills').select('id, final_amount, payment_status, created_at'),
                supabase.from('inventory').select('id, quantity_in_stock, minimum_stock_level'),
                supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5)
            ]);
            const transactions = transactionsStats.data || [];
            const bills = billsStats.data || [];
            const inventory = inventoryStats.data || [];
            const today = new Date().toISOString().split('T')[0];
            const todayTransactions = transactions.filter(t => t.created_at && t.created_at.startsWith(today));
            const todayBills = bills.filter(b => b.created_at && b.created_at.startsWith(today));
            const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.amount_given) || 0), 0);
            const totalProfit = transactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
            const todayRevenue = todayTransactions.reduce((sum, t) => sum + (parseFloat(t.amount_given) || 0), 0);
            const todayProfit = todayTransactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
            const unpaidBills = bills.filter(b => b.payment_status === 'pending').length;
            const lowStockItems = inventory.filter(item => (item.quantity_in_stock || 0) <= (item.minimum_stock_level || 5)).length;
            return {
                totalTransactions: transactions.length,
                totalRevenue: totalRevenue,
                totalProfit: totalProfit,
                todayRevenue: todayRevenue,
                todayProfit: todayProfit,
                pendingTransactions: todayTransactions.length,
                totalBills: bills.length,
                unpaidBills: unpaidBills,
                lowStockItems: lowStockItems,
                recentTransactions: recentTransactions.data || []
            };
        }
        catch (error) {
            console.error('Error getting dashboard data:', error);
            return {
                totalTransactions: 0,
                totalRevenue: 0,
                totalProfit: 0,
                todayRevenue: 0,
                todayProfit: 0,
                pendingTransactions: 0,
                totalBills: 0,
                unpaidBills: 0,
                lowStockItems: 0,
                recentTransactions: []
            };
        }
    }
    async getInventoryItems(limit, offset) {
        try {
            let query = supabase
                .from('inventory')
                .select('*')
                .order('name');
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
            console.error('Error getting inventory items:', error);
            return [];
        }
    }
}
async function ensureDefaultUser(username, password, role) {
    try {
        console.log(`🔍 Checking if user '${username}' exists...`);
        const existingUser = await exports.storage.getUserByUsername(username);
        if (existingUser) {
            console.log(`✅ User '${username}' already exists with role: ${existingUser.role}`);
            const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
            if (!isPasswordCorrect) {
                console.log(`🔄 Updating password for user '${username}'...`);
                const hashedPassword = await bcrypt.hash(password, 10);
                await sql('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);
                console.log(`✅ Password updated for user '${username}'`);
            }
            else {
                console.log(`✅ Password is correct for user '${username}'`);
            }
            return;
        }
        console.log(`🆕 Creating new user '${username}' with role '${role}'...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql('INSERT INTO users (username, password, role, shop_id) VALUES ($1, $2, $3, $4)', [username, hashedPassword, role, 'default']);
        console.log(`✅ User '${username}' created successfully with role '${role}'`);
    }
    catch (error) {
        console.error(`❌ Error ensuring default user '${username}':`, error);
    }
}
exports.storage = new DatabaseStorage();
exports.default = exports.storage;
DatabaseStorage.prototype.getInventoryItems = async function (limit, offset) {
    try {
        let query = supabase
            .from('inventory')
            .select('*')
            .order('name');
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
        console.error('Error getting inventory items:', error);
        return [];
    }
};
DatabaseStorage.prototype.getInventoryItem = async function (id) {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            return null;
        return data;
    }
    catch (error) {
        return null;
    }
};
DatabaseStorage.prototype.updateInventoryItem = async function (id, data) {
    try {
        const { data: item, error } = await supabase
            .from('inventory')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error)
            return null;
        return item;
    }
    catch (error) {
        return null;
    }
};
DatabaseStorage.prototype.deleteInventoryItem = async function (id) {
    try {
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);
        return !error;
    }
    catch (error) {
        return false;
    }
};
DatabaseStorage.prototype.getLowStockItems = async function () {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('name');
        if (error)
            throw error;
        const items = data || [];
        return items.filter(item => (item.quantity_in_stock || 0) <= (item.minimum_stock_level || 5));
    }
    catch (error) {
        console.error('Error getting low stock items:', error);
        return [];
    }
};
//# sourceMappingURL=storage.js.map