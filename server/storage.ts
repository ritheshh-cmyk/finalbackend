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
import { sql } from './db';
import { pool } from './db';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pxvtfywumekpdtablcjq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dnRmeXd1bWVrcGR0YWJsY2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMzOTYwNiwiZXhwIjoyMDY5OTE1NjA2fQ.N_nUTBI89ydKXQ2OWhrxz-AvnqNqjF35i_CPHUIC790'
);

// Helper function to execute SQL with retry logic for better error handling
async function executeWithRetry(queryFn: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      console.error(`❌ Database query attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || 
          error.code === 'XX000' || error.message.includes('connection') || 
          error.message.includes('termination') || error.message.includes('db_termination')) {
        console.log(`🔄 Retrying database query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      } else {
        throw error;
      }
    }
  }
}

class DatabaseStorage {
  // ========================================
  // USER MANAGEMENT
  // ========================================
  
  async getUserByUsername(username: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
        
      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUserById(id: number): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at')
        .eq('id', id)
        .single();
        
      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  async createUser(data: any): Promise<any> {
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
      
    if (error) throw error;
    return userData;
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updateUser(id: number, data: any): Promise<any | null> {
    try {
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
        
      if (error) return null;
      return userData;
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

  // ========================================
  // STATISTICS (FIXED)
  // ========================================

  async getTodayStats(): Promise<any> {
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
    } catch (error) {
      console.error('Error getting today stats:', error);
      throw error;
    }
  }

  async getWeekStats(): Promise<any> {
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
    } catch (error) {
      console.error('Error getting week stats:', error);
      throw error;
    }
  }

  async getMonthStats(): Promise<any> {
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
    } catch (error) {
      console.error('Error getting month stats:', error);
      throw error;
    }
  }

  async getYearStats(): Promise<any> {
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
    } catch (error) {
      console.error('Error getting year stats:', error);
      throw error;
    }
  }

  // ========================================
  // DASHBOARD DATA
  // ========================================

  async getDashboardTotals(): Promise<any> {
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
      const lowStockItems = inventory?.filter(item => 
        (item.quantity_in_stock || 0) <= (item.minimum_stock_level || 5)
      ).length || 0;

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
    } catch (error) {
      console.error('Error getting dashboard totals:', error);
      throw error;
    }
  }

  async getWeeklyStatistics(): Promise<any[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount_given, profit, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

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
    } catch (error) {
      console.error('Error getting weekly statistics:', error);
      throw error;
    }
  }

  async getRecentTransactions(limit: number = 5): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getTopSuppliers(limit: number = 5): Promise<any[]> {
    try {
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*');
        
      const { data: payments, error: paymentsError } = await supabase
        .from('supplier_payments')
        .select('supplier_id, amount');

      if (suppliersError || paymentsError) return [];

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
    } catch (error) {
      return [];
    }
  }

  // ========================================
  // MANAGEMENT ENDPOINTS
  // ========================================

  async getBills(limit?: number, offset?: number): Promise<any[]> {
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
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting bills:', error);
      throw error;
    }
  }

  async getExpenditures(limit?: number, offset?: number): Promise<any[]> {
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
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting expenditures:', error);
      throw error;
    }
  }

  async getSupplierPayments(supplierId?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('supplier_payments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting supplier payments:', error);
      throw error;
    }
  }

  async getGroupedExpenditures(limit?: number, offset?: number): Promise<any[]> {
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
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting grouped expenditures:', error);
      throw error;
    }
  }

  async getPurchaseOrders(limit?: number, offset?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting purchase orders:', error);
      throw error;
    }
  }

  // ========================================
  // ADVANCED FEATURES
  // ========================================

  async getNotifications(userId?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async getUserSettings(userId?: number): Promise<any> {
    try {
      let query = supabase
        .from('settings')
        .select('*')
        .order('setting_key');
        
      if (userId) {
        query = query.or(`user_id.eq.${userId},setting_type.eq.system`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user settings:', error);
      return [];
    }
  }

  async getActivityLog(userId?: number): Promise<any[]> {
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
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting activity log:', error);
      return [];
    }
  }

  async searchTransactions(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`customer_name.ilike.%${query}%,mobile_number.ilike.%${query}%,device_model.ilike.%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async searchSuppliers(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,contact_number.ilike.%${query}%,address.ilike.%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async searchInventory(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('name');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getAllPermissions(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('resource', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  }

  async getAllReports(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  }

  async getReportsByDateRange(dateRange: string): Promise<any[]> {
    try {
      const today = new Date();
      let startDate: Date;
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
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  // ========================================
  // CORE DATA OPERATIONS
  // ========================================

  async createTransaction(data: any): Promise<any> {
    console.log('🔄 Creating transaction in database:', data);
    
    const externalCost = data.externalItemCost || 0;
    const internalCost = data.internalCost || 0;
    const partsCost = typeof data.partsCost === 'number' ? data.partsCost : 0;
    
    const serviceCost = data.repairServiceType === 'external' ? externalCost : internalCost;
    const actualCost = (data.repairCost || 0) + serviceCost + partsCost;
    const profit = (data.amountGiven || 0) - actualCost;
    
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          customer_name: data.customerName,
          mobile_number: data.mobileNumber,
          device_model: data.deviceModel,
          repair_type: data.repairType,
          repair_cost: data.repairCost,
          payment_method: data.paymentMethod,
          amount_given: data.amountGiven,
          change_returned: data.changeReturned,
          status: data.status || 'Completed',
          remarks: data.remarks,
          parts_cost: partsCost,
          free_glass_installation: data.freeGlassInstallation || false,
          requires_inventory: data.requiresInventory || false,
          external_item_cost: externalCost,
          internal_cost: internalCost,
          actual_cost: actualCost,
          profit: profit,
          repair_service_type: data.repairServiceType || 'internal'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('✅ Transaction created successfully:', transaction);
      return transaction;
    } catch (error) {
      console.error('❌ Transaction creation failed:', error);
      throw error;
    }
  }

  async createInventoryItem(data: any): Promise<any> {
    try {
      const { data: item, error } = await supabase
        .from('inventory')
        .insert({
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          quantity_in_stock: data.quantity || 0,
          selling_price: data.unitPrice || 0,
          supplier_id: data.supplierId || null,
          sku: data.sku || null,
          minimum_stock_level: data.minimumStock || 0
        })
        .select()
        .single();
        
      if (error) throw error;
      return item;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async createSupplier(data: any): Promise<any> {
    try {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert({
          name: data.name,
          contact_number: data.contactNumber || null,
          address: data.address || null,
          shop_id: 'default'
        })
        .select()
        .single();
        
      if (error) throw error;
      return supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async createSupplierPayment(data: any): Promise<any> {
    try {
      const { data: payment, error } = await supabase
        .from('supplier_payments')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return payment;
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw error;
    }
  }

  // ========================================
  // LEGACY COMPATIBILITY METHODS
  // ========================================

  async getTransaction(id: number): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  async getTransactions(limit?: number, offset?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async updateTransaction(id: number, data: any): Promise<any | null> {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return null;
      return transaction;
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

  async getSuppliers(limit?: number, offset?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async updateSupplier(id: number, data: any): Promise<any | null> {
    try {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return null;
      return supplier;
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

  // Additional methods that might be called by legacy code
  async getSupplierExpenditureSummary(): Promise<any> {
    return {
      totalOwed: 0,
      totalPaid: 0,
      suppliers: []
    };
  }

  async createExpenditure(data: any): Promise<any> {
    try {
      const { data: expenditure, error } = await supabase
        .from('expenditures')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return expenditure;
    } catch (error) {
      console.error('Error creating expenditure:', error);
      throw error;
    }
  }

  async updateExpenditure(id: number, data: any): Promise<any> {
    try {
      const { data: expenditure, error } = await supabase
        .from('expenditures')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return expenditure;
    } catch (error) {
      return null;
    }
  }

  async deleteExpenditure(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('expenditures')
        .delete()
        .eq('id', id);
        
      return !error;
    } catch (error) {
      return false;
    }
  }

  async createBill(data: any): Promise<any> {
    try {
      const { data: bill, error } = await supabase
        .from('bills')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return bill;
    } catch (error) {
      throw error;
    }
  }

  async getBill(id: number): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  async updateBill(id: number, data: any): Promise<any | null> {
    try {
      const { data: bill, error } = await supabase
        .from('bills')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return null;
      return bill;
    } catch (error) {
      return null;
    }
  }

  async deleteBill(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);
        
      return !error;
    } catch (error) {
      return false;
    }
  }

  async createGroupedExpenditure(data: any): Promise<any> {
    try {
      const { data: groupedExpenditure, error } = await supabase
        .from('grouped_expenditures')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return groupedExpenditure;
    } catch (error) {
      throw error;
    }
  }

  async getGroupedExpenditure(id: number): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('grouped_expenditures')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  async updateGroupedExpenditure(id: number, data: any): Promise<any> {
    try {
      const { data: expenditure, error } = await supabase
        .from('grouped_expenditures')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return null;
      return expenditure;
    } catch (error) {
      return null;
    }
  }

  async deleteGroupedExpenditure(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('grouped_expenditures')
        .delete()
        .eq('id', id);
        
      return !error;
    } catch (error) {
      return false;
    }
  }

  async createGroupedExpenditurePayment(data: any): Promise<any> {
    try {
      const { data: payment, error } = await supabase
        .from('grouped_expenditure_payments')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return payment;
    } catch (error) {
      throw error;
    }
  }

  async getGroupedExpenditurePayments(groupedExpenditureId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('grouped_expenditure_payments')
        .select('*')
        .eq('grouped_expenditure_id', groupedExpenditureId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async deleteGroupedExpenditurePayment(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('grouped_expenditure_payments')
        .delete()
        .eq('id', id);
        
      return !error;
    } catch (error) {
      return false;
    }
  }

  async searchGroupedExpenditures(search: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('grouped_expenditures')
        .select('*')
        .or(`provider_name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getGroupedExpendituresByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('grouped_expenditures')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  // Additional methods for backward compatibility
  async getBillsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async searchBills(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .or(`customer_name.ilike.%${query}%,bill_number.ilike.%${query}%,customer_phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  // Backup and utility methods
  async backupShopData(shopId: string): Promise<any> {
    try {
      const [transactions, bills, expenditures, suppliers] = await Promise.all([
        supabase.from('transactions').select('*').eq('shop_id', shopId),
        supabase.from('bills').select('*'),
        supabase.from('expenditures').select('*'),
        supabase.from('suppliers').select('*').eq('shop_id', shopId)
      ]);

      return {
        transactions: transactions.data || [],
        bills: bills.data || [],
        expenditures: expenditures.data || [],
        suppliers: suppliers.data || [],
        backup_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error backing up shop data:', error);
      throw error;
    }
  }

  async restoreShopData(shopId: string, data: any): Promise<void> {
    console.log('Restore functionality not implemented yet');
  }

  async getTransactionsByDateRangeForShop(shopId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('shop_id', shopId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getBillsByDateRangeForShop(shopId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getExpendituresByDateRangeForShop(shopId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('expenditures')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async saveFeedback(billId: string, feedback: string): Promise<void> {
    console.log(`Feedback for bill ${billId}: ${feedback}`);
  }

  async getFeedback(billId: string): Promise<string | null> {
    return null;
  }

  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Clear all data functionality disabled for safety');
      return { success: false, message: 'Clear all data is disabled for safety' };
    } catch (error) {
      return { success: false, message: 'Failed to clear data' };
    }
  }
}

// Ensure default user function
export async function ensureDefaultUser(username: string, password: string, role: string): Promise<void> {
  try {
    console.log(`🔍 Checking if user '${username}' exists...`);
    
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (existingUser && !error) {
      console.log(`✅ User '${username}' already exists with role: ${existingUser.role}`);
      
      const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
      if (!isPasswordCorrect) {
        console.log(`🔄 Updating password for user '${username}'...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('username', username);
          
        if (!updateError) {
          console.log(`✅ Password updated for user '${username}'`);
        }
      } else {
        console.log(`✅ Password is correct for user '${username}'`);
      }
      return;
    }
    
    console.log(`🆕 Creating new user '${username}' with role '${role}'...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { error: createError } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        role,
        shop_id: 'default'
      });
    
    if (!createError) {
      console.log(`✅ User '${username}' created successfully with role '${role}'`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring default user '${username}':`, error);
  }
}

export const storage = new DatabaseStorage();
export default storage;
