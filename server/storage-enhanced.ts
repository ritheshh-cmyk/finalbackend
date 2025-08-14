import { z } from "zod";
import { 
  type User, 
  type InsertUser, 
  type Transaction, 
  type InsertTransaction,
  type Supplier,
  type InsertSupplier,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type SupplierPayment,
  type InsertSupplierPayment,
  type Expenditure,
  type InsertExpenditure,
  type GroupedExpenditure,
  type InsertGroupedExpenditure,
  type GroupedExpenditurePayment,
  type InsertGroupedExpenditurePayment
} from "../shared/schema";
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

// Enhanced Supabase client with better error handling and retry logic
const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://rlmebwbzqmoxqevmzddp.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbWVid2J6cW1veHFldm16ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxOTczNjEsImV4cCI6MjA0OTc3MzM2MX0.fQnEzf1r8PpAOqTmBsVULIyLBvGFbC1SU1VJOKhW_J8';
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
};

// Retry wrapper for database operations
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error?.message || error);
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

const supabase = createSupabaseClient();

export class DatabaseStorage {
  // User Methods
  async getUserByUsername(username: string): Promise<any | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    });
  }

  async getUserById(id: number): Promise<User | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as User;
    });
  }

  async createUser(data: InsertUser): Promise<User> {
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
        
      if (error) throw error;
      return userData as unknown as User;
    });
  }

  async getAllUsers(): Promise<User[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at');
        
      if (error) throw error;
      return (data || []) as unknown as User[];
    });
  }

  async updateUser(id: number, data: any): Promise<User | null> {
    return withRetry(async () => {
      const updateData: any = { ...data };
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
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return userData as unknown as User;
    });
  }

  async deleteUser(id: number): Promise<boolean> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    });
  }

  // Transaction Methods
  async getTransactions(limit?: number, offset?: number): Promise<Transaction[]> {
    return withRetry(async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Transaction[];
    });
  }

  async searchTransactions(query: string): Promise<Transaction[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .ilike('customerName', `%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return (data || []) as Transaction[];
    });
  }

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    return withRetry(async () => {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(data)
        .select('*')
        .single();
        
      if (error) throw error;
      return transaction as Transaction;
    });
  }

  // Supplier Methods
  async getSuppliers(): Promise<Supplier[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      return (data || []) as Supplier[];
    });
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    return withRetry(async () => {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert(data)
        .select('*')
        .single();
        
      if (error) throw error;
      return supplier as Supplier;
    });
  }

  // Expenditure Methods
  async getExpenditures(limit?: number, offset?: number): Promise<Expenditure[]> {
    return withRetry(async () => {
      let query = supabase
        .from('expenditures')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Expenditure[];
    });
  }

  async createExpenditure(data: InsertExpenditure): Promise<Expenditure> {
    return withRetry(async () => {
      const { data: expenditure, error } = await supabase
        .from('expenditures')
        .insert(data)
        .select('*')
        .single();
        
      if (error) throw error;
      return expenditure as Expenditure;
    });
  }

  // Grouped Expenditure Methods
  async getGroupedExpenditures(limit?: number, offset?: number): Promise<GroupedExpenditure[]> {
    return withRetry(async () => {
      let query = supabase
        .from('grouped_expenditures')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GroupedExpenditure[];
    });
  }

  async createGroupedExpenditure(data: InsertGroupedExpenditure): Promise<GroupedExpenditure> {
    return withRetry(async () => {
      const { data: expenditure, error } = await supabase
        .from('grouped_expenditures')
        .insert(data)
        .select('*')
        .single();
        
      if (error) throw error;
      return expenditure as GroupedExpenditure;
    });
  }

  // Purchase Order Methods
  async getPurchaseOrders(limit?: number, offset?: number): Promise<PurchaseOrder[]> {
    return withRetry(async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PurchaseOrder[];
    });
  }

  // Supplier Payment Methods
  async getSupplierPayments(supplierId?: number): Promise<SupplierPayment[]> {
    return withRetry(async () => {
      let query = supabase
        .from('supplier_payments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SupplierPayment[];
    });
  }

  // Stats Methods
  async getTodayStats(): Promise<any> {
    return withRetry(async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('transactions')
        .select('repairCost, amountGiven')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);
        
      if (error) throw error;
      
      const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
      const totalTransactions = (data || []).length;
      
      return { totalRevenue, totalTransactions };
    });
  }

  async getWeekStats(): Promise<any> {
    return withRetry(async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('transactions')
        .select('repairCost, amountGiven')
        .gte('created_at', weekAgo.toISOString());
        
      if (error) throw error;
      
      const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
      const totalTransactions = (data || []).length;
      
      return { totalRevenue, totalTransactions };
    });
  }

  async getMonthStats(): Promise<any> {
    return withRetry(async () => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('transactions')
        .select('repairCost, amountGiven')
        .gte('created_at', monthAgo.toISOString());
        
      if (error) throw error;
      
      const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
      const totalTransactions = (data || []).length;
      
      return { totalRevenue, totalTransactions };
    });
  }

  async getYearStats(): Promise<any> {
    return withRetry(async () => {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('transactions')
        .select('repairCost, amountGiven')
        .gte('created_at', yearAgo.toISOString());
        
      if (error) throw error;
      
      const totalRevenue = (data || []).reduce((sum, t) => sum + (t.repairCost || 0), 0);
      const totalTransactions = (data || []).length;
      
      return { totalRevenue, totalTransactions };
    });
  }

  // Dashboard Methods
  async getDashboardTotals(): Promise<any> {
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
        totalCustomers: totalTransactions, // Approximate
        totalBills: 0,
        totalInventory: 0,
        totalPurchaseOrders: 0
      };
    });
  }

  async getDashboardStats(): Promise<any> {
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

  // Other Methods
  async getBills(limit?: number, offset?: number): Promise<any[]> {
    // Mock implementation - return empty array
    return [];
  }

  async createBill(data: any): Promise<any> {
    // Mock implementation
    return { id: Date.now(), ...data, created_at: new Date().toISOString() };
  }

  async getReports(): Promise<any[]> {
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

  async getTransactionReports(period: 'today' | 'week' | 'month'): Promise<any[]> {
    return withRetry(async () => {
      let startDate: Date;
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
        
      if (error) throw error;
      return data || [];
    });
  }

  async getRecentTransactions(limit: number = 5): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      return data || [];
    });
  }

  async getUserSettings(userId?: number): Promise<any> {
    return { theme: 'light', notifications: true, language: 'en' };
  }

  async getSettings(userId?: number): Promise<any[]> {
    return [{ theme: 'light', notifications: true, language: 'en' }];
  }

  async getPermissions(userId?: number): Promise<any> {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true };
  }

  async getActivityLog(userId?: number): Promise<any[]> {
    return [];
  }

  async getNotifications(userId?: number): Promise<any[]> {
    return [];
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
