// Simple working storage.ts with all required methods
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pxvtfywumekpdtablcjq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dnRmeXd1bWVrcGR0YWJsY2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMzOTYwNiwiZXhwIjoyMDY5OTE1NjA2fQ.N_nUTBI89ydKXQ2OWhrxz-AvnqNqjF35i_CPHUIC790'
);

export class DatabaseStorage {
  // User methods
  async createUser(userData: any): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const { data, error } = await supabase
        .from('users')
        .insert({ ...userData, password: hashedPassword })
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getUserById(id: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async updateUser(id: number, updateData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Transaction methods
  async createTransaction(transactionData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getAllTransactions(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getTransactionById(id: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async updateTransaction(id: number, updateData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async deleteTransaction(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Supplier methods
  async createSupplier(supplierData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getAllSuppliers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*');
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getSupplierById(id: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async updateSupplier(id: number, updateData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async deleteSupplier(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Statistics methods
  async getTodayStats(): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [transactions, expenditures] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', today),
        supabase.from('expenditures').select('*').gte('created_at', today)
      ]);
      
      const totalRevenue = transactions.data?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalExpenses = expenditures.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      return {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        transactions: transactions.data?.length || 0
      };
    } catch (error) {
      return { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
    }
  }

  async getWeekStats(): Promise<any> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      
      const [transactions, expenditures] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', weekAgoStr),
        supabase.from('expenditures').select('*').gte('created_at', weekAgoStr)
      ]);
      
      const totalRevenue = transactions.data?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalExpenses = expenditures.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      return {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        transactions: transactions.data?.length || 0
      };
    } catch (error) {
      return { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
    }
  }

  async getMonthStats(): Promise<any> {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      
      const [transactions, expenditures] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', monthAgoStr),
        supabase.from('expenditures').select('*').gte('created_at', monthAgoStr)
      ]);
      
      const totalRevenue = transactions.data?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalExpenses = expenditures.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      return {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        transactions: transactions.data?.length || 0
      };
    } catch (error) {
      return { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
    }
  }

  async getYearStats(): Promise<any> {
    try {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const yearAgoStr = yearAgo.toISOString().split('T')[0];
      
      const [transactions, expenditures] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', yearAgoStr),
        supabase.from('expenditures').select('*').gte('created_at', yearAgoStr)
      ]);
      
      const totalRevenue = transactions.data?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalExpenses = expenditures.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      return {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        transactions: transactions.data?.length || 0
      };
    } catch (error) {
      return { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
    }
  }

  async getDashboardTotals(): Promise<any> {
    try {
      const [transactions, suppliers, expenditures, inventory] = await Promise.all([
        supabase.from('transactions').select('total_amount'),
        supabase.from('suppliers').select('id'),
        supabase.from('expenditures').select('amount'),
        supabase.from('inventory').select('id')
      ]);
      
      const totalRevenue = transactions.data?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalExpenses = expenditures.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      return {
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        totalSuppliers: suppliers.data?.length || 0,
        totalProducts: inventory.data?.length || 0
      };
    } catch (error) {
      return { totalRevenue: 0, totalExpenses: 0, totalProfit: 0, totalSuppliers: 0, totalProducts: 0 };
    }
  }

  async getWeeklyStatistics(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('created_at, total_amount')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) return [];
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getRecentTransactions(limit: number = 5): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getTopSuppliers(limit: number = 5): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .limit(limit);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  // Other methods
  async getBills(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getExpenditures(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('expenditures')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getSupplierPayments(supplierId?: number): Promise<any[]> {
    try {
      let query = supabase.from('supplier_payments').select('*');
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query;
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getGroupedExpenditures(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('grouped_expenditures')
        .select('*')
        .range(offset, offset + limit - 1);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getPurchaseOrders(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .range(offset, offset + limit - 1);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getNotifications(userId?: number): Promise<any[]> {
    try {
      let query = supabase.from('notifications').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getUserSettings(userId?: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId || 1)
        .single();
      return error ? {} : (data || {});
    } catch (error) {
      return {};
    }
  }

  async getActivityLog(userId?: number): Promise<any[]> {
    try {
      let query = supabase.from('activity_log').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async searchTransactions(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`customer_name.ilike.%${query}%,device_model.ilike.%${query}%`);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async searchSuppliers(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,contact_person.ilike.%${query}%`);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async searchInventory(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getAllPermissions(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('permissions').select('*');
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getAllReports(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('reports').select('*');
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getReportsByDateRange(dateRange: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', dateRange);
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async getInventory(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('inventory').select('*');
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async createInventoryItem(itemData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert(itemData)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async getInventoryItem(id: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', id)
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async updateInventoryItem(id: number, updateData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return error ? null : data;
    } catch (error) {
      return null;
    }
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  }

  async getLowStockItems(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('inventory').select('*');
      if (error) return [];
      return (data || []).filter((item: any) => 
        (item.quantity_in_stock || 0) <= (item.minimum_stock_level || 5)
      );
    } catch (error) {
      return [];
    }
  }
}

// Create storage instance
const storage = new DatabaseStorage();

// Helper function
export async function ensureDefaultUser(username: string, password: string, role: string): Promise<void> {
  const existingUser = await storage.getUserByUsername(username);
  if (!existingUser) {
    await storage.createUser({
      username,
      password,
      role,
      shop_id: 'default'
    });
  }
}

export { storage };
export default storage;
