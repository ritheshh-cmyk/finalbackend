import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rlmebwbzqmoxqevmzddp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbWVid2J6cW1veHFldm16ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxOTczNjEsImV4cCI6MjA0OTc3MzM2MX0.fQnEzf1r8PpAOqTmBsVULIyLBvGFbC1SU1VJOKhW_J8';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper function to check if a transaction is older than 24 hours
 * Used for worker role edit/delete restrictions
 */
function isTransactionOlderThan24Hours(createdAt: string): boolean {
  const transactionDate = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
  return diffInHours > 24;
}

/**
 * Check if worker user can edit/delete a transaction (must be within 24 hours)
 */
function canWorkerModifyTransaction(userRole: string, transactionCreatedAt: string): boolean {
  if (userRole !== 'worker') {
    return true; // Non-worker users can always modify
  }
  return !isTransactionOlderThan24Hours(transactionCreatedAt);
}

// Types
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

class DatabaseStorage {
  // User methods
  async getUserById(id: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data as unknown as User;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, password_hash, role, shop_id, created_at')
        .eq('username', username)
        .single();

      if (error || !data) return null;
      // Return user with password field mapped from password_hash
      return {
        id: data.id,
        username: data.username,
        password: data.password_hash,
        role: data.role,
        shop_id: data.shop_id,
      } as unknown as User;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, shop_id, created_at');

      if (error) throw error;
      return data as unknown as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async createUser(userData: any): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select('id, username, role, shop_id, created_at')
        .single();

      if (error) throw error;
      return data as unknown as User;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Transaction methods
  async getTransactions(userRole?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let transactions = data || [];
      
      // 🔒 ROLE-BASED DATA FILTERING
      // Only worker users get restricted data
      // All other roles (admin, owner, user, demo) see full real data
      if (userRole === 'worker') {
        transactions = transactions.slice(0, 20); // Workers see latest 20 transactions
        console.log(`🚫 Worker role - showing latest 20 transactions: ${transactions.length}`);
      } else {
        console.log(`✅ Full access role - showing all transactions: ${transactions.length}`);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async createTransaction(transactionData: any): Promise<any> {
    try {
      // ✅ CORRECTED PROFIT CALCULATION
      const externalCost = transactionData.externalItemCost || 0;
      const internalCost = transactionData.internalCost || 0;
      
      // Calculate total parts cost from parts array or use direct numeric value
      let partsCost = 0;
      if (transactionData.partsCost) {
        if (Array.isArray(transactionData.partsCost)) {
          partsCost = transactionData.partsCost.reduce((total, part) => total + (part.cost || 0), 0);
        } else if (typeof transactionData.partsCost === 'number') {
          partsCost = transactionData.partsCost;
        } else if (typeof transactionData.partsCost === 'string') {
          partsCost = parseFloat(transactionData.partsCost) || 0;
        }
      }
      
      // ✅ CORRECTED: For customer transactions: profit = customer_payment - (service_cost + parts_cost)
      // Service cost depends on repair type (internal vs external)
      const serviceCost = transactionData.repairServiceType === 'external' ? externalCost : internalCost;
      const actualCost = serviceCost + partsCost; // Fixed: removed repairCost from actualCost
      const profit = transactionData.amountGiven - actualCost;
      
      // Add calculated values to transaction data
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(id: number, transactionData: any, userRole?: string): Promise<any> {
    try {
      // First, get the existing transaction to check creation time for worker restrictions
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching transaction for update:', fetchError);
        throw fetchError;
      }

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      // Check if worker user can modify this transaction (24-hour rule)
      if (!canWorkerModifyTransaction(userRole || '', existingTransaction.created_at)) {
        throw new Error('Worker users can only edit transactions within 24 hours of creation');
      }

      // If we have partsCost in the update data, calculate new profit
      if (transactionData.partsCost !== undefined || 
          transactionData.repair_cost !== undefined ||
          transactionData.internalCost !== undefined ||
          transactionData.externalItemCost !== undefined) {
        
        const externalCost = transactionData.externalItemCost || existingTransaction.external_item_cost || 0;
        const internalCost = transactionData.internalCost || existingTransaction.internal_cost || 0;
        const repairCost = transactionData.repair_cost || existingTransaction.repair_cost || 0;
        
        let partsCost = 0;
        if (transactionData.partsCost !== undefined) {
          if (Array.isArray(transactionData.partsCost)) {
            partsCost = transactionData.partsCost.reduce((total, part) => total + (part.cost || 0), 0);
          } else {
            partsCost = parseFloat(transactionData.partsCost) || 0;
          }
        } else {
          partsCost = existingTransaction.parts_cost || 0;
        }

        const totalExpenses = externalCost + internalCost + partsCost;
        const calculatedProfit = repairCost - totalExpenses;
        
        transactionData.profit = calculatedProfit;
        console.log(`💰 Updated profit calculation: ₹${repairCost} - ₹${totalExpenses} = ₹${calculatedProfit}`);
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Transaction updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: number, userRole?: string): Promise<boolean> {
    try {
      // First, get the existing transaction to check creation time for worker restrictions
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('created_at')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching transaction for deletion:', fetchError);
        throw fetchError;
      }

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      // Check if worker user can delete this transaction (24-hour rule)
      if (!canWorkerModifyTransaction(userRole || '', existingTransaction.created_at)) {
        throw new Error('Worker users can only delete transactions within 24 hours of creation');
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Transaction deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Supplier methods
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  async createSupplier(supplierData: any): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  // Bill methods
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
      return [];
    }
  }

  async createBill(billData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .insert(billData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  // Expenditure methods (mock implementations)
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
      return [];
    }
  }

  async createExpenditure(expenditureData: any): Promise<any> {
    try {
      // Transform camelCase fields to snake_case for database
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating expenditure:', error);
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
      return [];
    }
  }

  async createGroupedExpenditure(expenditureData: any): Promise<any> {
    try {
      // Transform camelCase fields to snake_case for database
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating grouped expenditure:', error);
      throw error;
    }
  }

  // Mock implementations for missing tables
  async getSupplierPayments(supplierId?: number): Promise<any[]> {
    try {
      // Mock implementation since supplier_payments table doesn't exist yet
      // Return empty array for now to prevent 500 errors
      return [];
    } catch (error) {
      console.error('Error getting supplier payments:', error);
      return [];
    }
  }

  async getPurchaseOrders(limit?: number, offset?: number): Promise<any[]> {
    try {
      // Mock implementation since purchase_orders table doesn't exist yet
      // Return empty array for now to prevent 500 errors
      return [];
    } catch (error) {
      console.error('Error getting purchase orders:', error);
      return [];
    }
  }

  // Stats methods
  async getTodayStats(userRole?: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('repair_cost, profit')
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let filteredTransactions = transactions || [];
      
      // 🔒 ROLE-BASED FILTERING FOR STATS
      if (userRole === 'worker') {
        filteredTransactions = filteredTransactions.slice(0, 20);
        console.log(`🚫 Worker role today stats - limited to ${filteredTransactions.length} transactions`);
      } else {
        console.log(`✅ Full access today stats - showing ${filteredTransactions.length} transactions`);
      }
      
      const count = filteredTransactions.length;
      const revenue = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
      const profit = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

      return { transactions: count, revenue, profit };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return { transactions: 0, revenue: 0, profit: 0 };
    }
  }

  async getWeekStats(userRole?: string): Promise<any> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('repair_cost, profit')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let filteredTransactions = transactions || [];
      
      // 🔒 ROLE-BASED FILTERING FOR STATS
      if (userRole === 'worker') {
        filteredTransactions = filteredTransactions.slice(0, 20);
        console.log(`🚫 Worker role week stats - limited to ${filteredTransactions.length} transactions`);
      } else {
        console.log(`✅ Full access week stats - showing ${filteredTransactions.length} transactions`);
      }
      
      const count = filteredTransactions.length;
      const revenue = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);
      const profit = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

      return { transactions: count, revenue, profit };
    } catch (error) {
      console.error('Error getting week stats:', error);
      return { transactions: 0, revenue: 0, profit: 0 };
    }
  }

  async getMonthStats(): Promise<any> {
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('repair_cost')
        .gte('created_at', monthAgo.toISOString());

      if (error) throw error;
      
      const count = transactions.length;
      const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);

      return { transactions: count, revenue };
    } catch (error) {
      console.error('Error getting month stats:', error);
      return { transactions: 0, revenue: 0 };
    }
  }

  async getYearStats(): Promise<any> {
    try {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('repair_cost')
        .gte('created_at', yearAgo.toISOString());

      if (error) throw error;
      
      const count = transactions.length;
      const revenue = transactions.reduce((sum, t) => sum + (parseFloat(t.repair_cost) || 0), 0);

      return { transactions: count, revenue };
    } catch (error) {
      console.error('Error getting year stats:', error);
      return { transactions: 0, revenue: 0 };
    }
  }

  // Dashboard methods
  async getDashboardTotals(userRole?: string): Promise<any> {
    try {
      console.log('📊 Getting dashboard totals for role:', userRole || 'no-role');
      
      // Use the same pattern as getTransactions (which works)
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting transactions for dashboard:', error);
        throw error;
      }

      let transactionList = transactions || [];
      console.log(`Found ${transactionList.length} total transactions for dashboard`);

      // 🔒 ROLE-BASED DATA FILTERING
      // Only worker users get restricted data (limited/demo data)
      // All other roles (admin, owner, user, demo) see full real data
      if (userRole === 'worker') {
        // Worker users see latest 20 transactions only
        transactionList = transactionList.slice(0, 20); // Only latest 20 transactions
        console.log(`🚫 Worker role detected - showing latest 20 transactions: ${transactionList.length} transactions`);
      } else {
        // All other users (admin, owner, user, demo) see full real data
        console.log(`✅ Full access role detected - showing all data: ${transactionList.length} transactions`);
      }

      // Calculate totals from filtered data
      let totalRevenue = 0;
      let totalProfit = 0;
      let completedCount = 0;
      let pendingCount = 0;

      transactionList.forEach(transaction => {
        // Revenue calculation: Total amount customer pays for repair
        const revenue = parseFloat(transaction.repair_cost) || 0;
        totalRevenue += revenue;
        
        // Profit calculation: Already calculated profit from transaction.profit field
        // Profit = Revenue (repair_cost) - Total Expenses (part_cost + labor_cost + overhead)
        const profit = parseFloat(transaction.profit) || 0;
        totalProfit += profit;
        
        // Count by status
        if (transaction.status === 'completed' || transaction.status === 'Completed') {
          completedCount++;
        } else if (transaction.status === 'pending' || transaction.status === 'Pending') {
          pendingCount++;
        }
      });

      // Get suppliers count using same pattern
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*');

      const result = {
        totalTransactions: transactionList.length,
        totalRevenue,
        totalProfit,
        totalSuppliers: (suppliers || []).length,
        totalBills: 0,
        totalUsers: 1,
        avgTransactionValue: transactionList.length > 0 ? totalRevenue / transactionList.length : 0,
        completedTransactions: completedCount,
        pendingTransactions: pendingCount,
        // Add profit calculation explanation
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        userRole: userRole || 'guest',
        dataRestricted: userRole === 'worker'
      };

      console.log('✅ Dashboard totals calculated for role', userRole, ':', result);
      return result;

    } catch (error) {
      console.error('Error in getDashboardTotals:', error);
      return {
        totalTransactions: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalSuppliers: 0,
        totalBills: 0,
        totalUsers: 0,
        avgTransactionValue: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
      };
    }
  }

  async getRecentTransactions(limit = 5): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // Report methods
  async getAllReports(): Promise<any[]> {
    try {
      // Mock report data since we don't have a reports table
      return [
        { id: 1, name: 'Daily Sales Report', type: 'sales', created_at: new Date() },
        { id: 2, name: 'Weekly Revenue Report', type: 'revenue', created_at: new Date() },
        { id: 3, name: 'Monthly Summary Report', type: 'summary', created_at: new Date() },
        { id: 4, name: 'Supplier Analysis Report', type: 'supplier', created_at: new Date() },
        { id: 5, name: 'Transaction History Report', type: 'transaction', created_at: new Date() },
        { id: 6, name: 'Profit Margin Report', type: 'profit', created_at: new Date() }
      ];
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  }

  async getTransactionReportsByRange(range: 'today' | 'week' | 'month'): Promise<any[]> {
    try {
      let startDate: Date;
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error getting ${range} transaction reports:`, error);
      return [];
    }
  }

  // Settings and other methods
  async getUserSettings(): Promise<any> {
    return { notifications: true, theme: 'light', language: 'en' };
  }

  async getAllPermissions(): Promise<any> {
    return { permissions: ['read', 'write', 'admin'] };
  }

  async getNotifications(): Promise<any> {
    return { notifications: [] };
  }

  async getActivityLog(): Promise<any[]> {
    return [];
  }

  // Placeholder methods to prevent errors
  async updateUser(id: number, data: any): Promise<User | null> {
    return null;
  }

  async deleteUser(id: number): Promise<boolean> {
    return false;
  }

  async searchSuppliers(query: string): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', `%${query}%`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return [];
    }
  }

  async searchTransactions(query: string, userRole?: string): Promise<any[]> {
    try {
      if (!query) {
        return [];
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`customer_name.ilike.%${query}%,mobile_number.ilike.%${query}%,device_model.ilike.%${query}%,repair_type.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let transactions = data || [];
      
      // 🔒 ROLE-BASED SEARCH FILTERING
      // Only worker users get restricted search results
      if (userRole === 'worker') {
        transactions = transactions.slice(0, 20); // Workers see latest 20 search results
        console.log(`🚫 Worker role search - showing latest 20 results: ${transactions.length}`);
      } else {
        console.log(`✅ Full access search - showing all results: ${transactions.length} for role: ${userRole || 'guest'}`);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error searching transactions:', error);
      return [];
    }
  }
}

export const storage = new Storage();

// Export helper functions for worker time restrictions
export { isTransactionOlderThan24Hours, canWorkerModifyTransaction };
export default storage;
