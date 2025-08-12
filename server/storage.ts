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

// Helper function to execute SQL with retry logic for better error handling
async function executeWithRetry(queryFn: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      console.error(`❌ Database query attempt ${attempt} failed:`, error.message);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // If it's a connection error, wait before retrying
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || 
          error.code === 'XX000' || error.message.includes('connection') || 
          error.message.includes('termination') || error.message.includes('db_termination')) {
        console.log(`🔄 Retrying database query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }
}

// Helper function to safely execute database operations
async function safeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await executeWithRetry(operation);
  } catch (error: any) {
    console.error('❌ Database operation failed after retries:', error.message);
    
    // For critical operations like transaction creation, we might want to return a fallback
    if (error.message?.includes('db_termination') || error.code === 'XX000') {
      console.log('⚠️ Database connection issue detected, returning null');
      return null;
    }
    
    throw error;
  }
}
import bcrypt from 'bcryptjs';

// Database-backed storage for users
class DatabaseStorage {
  async getUserByUsername(username: string): Promise<any | null> {
    const users = await sql(
      'SELECT id, username, role, shop_id, created_at as "createdAt", password FROM users WHERE username = $1',
      [username]
    );
    if (users.length === 0) return null;
    return users[0];
  }

  // SMS FUNCTIONALITY (placeholder)
  async sendSMS(data: any): Promise<{ success: boolean; message: string }> {
    // This is a placeholder for SMS functionality
    // In a real implementation, you would integrate with an SMS service like Twilio
    console.log('SMS would be sent:', data);
    return { success: true, message: 'SMS sent successfully (simulated)' };
  }

  // RESTORE FUNCTIONALITY (placeholder)
  async restoreData(data: any): Promise<{ success: boolean; message: string }> {
    // This is a placeholder for data restoration functionality
    // In a real implementation, you would restore from backup files
    console.log('Data would be restored:', data);
    return { success: true, message: 'Data restored successfully (simulated)' };
  }

  // FEEDBACK
  async submitFeedback(data: any): Promise<{ success: boolean; message: string }> {
    // Log feedback to activity log
    await this.createActivityLog({
      userId: data.userId || null,
      action: 'feedback_submitted',
      entityType: 'feedback',
      description: `Feedback submitted: ${data.message}`,
      metadata: { rating: data.rating, category: data.category }
    });
    
    return { success: true, message: 'Feedback submitted successfully' };
  }

  async getUserById(id: number): Promise<User | null> {
    const users = await sql(
      'SELECT id, username, role, shop_id, created_at as "createdAt" FROM users WHERE id = $1',
      [id]
    );
    if (users.length === 0) return null;
    return users[0] as User;
  }

  // VERSION INFO
  async getVersion(): Promise<{ version: string; build: string; environment: string }> {
    return {
      version: '1.0.0',
      build: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const users = await sql(
      'INSERT INTO users (username, password, role, shop_id) VALUES ($1, $2, $3, $4) RETURNING id, username, role, shop_id, created_at as "createdAt"',
      [data.username, hashedPassword, data.role || 'worker', data.shop_id || 'default']
    );
    return users[0] as User;
  }

  // GLOBAL SEARCH
  async globalSearch(query: string): Promise<any> {
    const searchTerm = `%${query}%`;
    
    const [transactions, suppliers, inventory, bills] = await Promise.all([
      sql(
        `SELECT 'transaction' as type, id, customer_name as name, device_model as description, created_at 
         FROM transactions 
         WHERE customer_name ILIKE $1 OR mobile_number ILIKE $1 OR device_model ILIKE $1 
         LIMIT 10`,
        [searchTerm]
      ),
      sql(
        `SELECT 'supplier' as type, id, name, contact as description, created_at 
         FROM suppliers 
         WHERE name ILIKE $1 OR contact ILIKE $1 
         LIMIT 10`,
        [searchTerm]
      ),
      sql(
        `SELECT 'inventory' as type, id, name, description, created_at 
         FROM inventory_items 
         WHERE name ILIKE $1 OR description ILIKE $1 OR sku ILIKE $1 
         LIMIT 10`,
        [searchTerm]
      ),
      sql(
        `SELECT 'bill' as type, id, customer_name as name, bill_number as description, created_at 
         FROM bills 
         WHERE customer_name ILIKE $1 OR bill_number ILIKE $1 
         LIMIT 10`,
        [searchTerm]
      )
    ]);
    
    return {
      transactions,
      suppliers,
      inventory,
      bills,
      total: transactions.length + suppliers.length + inventory.length + bills.length
    };
  }

  async getAllUsers(): Promise<User[]> {
    const users = await sql(
      'SELECT id, username, role, shop_id, created_at as "createdAt" FROM users'
    );
    return users as User[];
  }

  // CLEAR ALL DATA
  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      // Clear all tables in reverse dependency order
      await sql('DELETE FROM activity_log');
      await sql('DELETE FROM notifications');
      await sql('DELETE FROM bills');
      await sql('DELETE FROM supplier_payments');
      await sql('DELETE FROM purchase_orders');
      await sql('DELETE FROM inventory_items');
      await sql('DELETE FROM transactions');
      await sql('DELETE FROM suppliers');
      await sql('DELETE FROM reports WHERE type != \'template\''); // Keep templates
      
      // Reset sequences
      await sql('ALTER SEQUENCE activity_log_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE notifications_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE bills_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE supplier_payments_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE inventory_items_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE transactions_id_seq RESTART WITH 1');
      await sql('ALTER SEQUENCE suppliers_id_seq RESTART WITH 1');
      
      return { success: true, message: 'All data cleared successfully' };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, message: 'Failed to clear data' };
    }
  }

  // TRANSACTIONS
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    console.log('🔄 Creating transaction in database:', data);
    
    // Calculate profit based on repair service type
    const externalCost = data.externalItemCost || 0;
    const internalCost = data.internalCost || 0;
    
    // Calculate total parts cost from parts array or use direct numeric value
    let partsCost = 0;
    if (data.partsCost) {
      if (Array.isArray(data.partsCost)) {
        partsCost = data.partsCost.reduce((total, part) => total + (part.cost || 0), 0);
      } else if (typeof data.partsCost === 'number') {
        partsCost = data.partsCost;
      } else if (typeof data.partsCost === 'string') {
        partsCost = parseFloat(data.partsCost) || 0;
      }
    }
    
    // For customer transactions: profit = customer_payment - repair_cost - service_cost - parts_cost
    // Service cost depends on repair type (internal vs external)
    const serviceCost = data.repairServiceType === 'external' ? externalCost : internalCost;
    const actualCost = data.repairCost + serviceCost + partsCost;
    const profit = data.amountGiven - actualCost;
    
    console.log('📊 Transaction calculations:', {
      externalCost,
      internalCost,
      partsCost,
      serviceCost,
      actualCost,
      profit
    });
    
    // Use retry logic for better error handling
    const result = await executeWithRetry(async () => {
      return await sql(
        `INSERT INTO transactions (
          customer_name, mobile_number, device_model, repair_type, repair_cost, payment_method, 
          amount_given, change_returned, status, remarks, parts_cost, free_glass_installation, requires_inventory,
          external_item_cost, internal_cost, actual_cost, profit, repair_service_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
        [
          data.customerName, data.mobileNumber, data.deviceModel, data.repairType, 
          Number(data.repairCost), data.paymentMethod, Number(data.amountGiven), Number(data.changeReturned), 
          data.status || 'Completed', data.remarks || null, 
          Number(partsCost), data.freeGlassInstallation || false, data.requiresInventory || false,
          Number(externalCost), Number(internalCost), Number(actualCost), Number(profit), data.repairServiceType || 'internal'
        ]
      );
    });
    
    console.log('✅ Transaction created successfully:', result[0]);
    return result[0] as Transaction;
  }

  async getTransaction(id: number): Promise<Transaction | null> {
    const result = await sql('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.length ? (result[0] as Transaction) : null;
  }

  async getTransactions(limit?: number, offset?: number): Promise<Transaction[]> {
    if (limit && offset !== undefined) {
      const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return result as Transaction[];
    }
    const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC');
    return result as Transaction[];
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const result = await sql(
      'SELECT * FROM transactions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate.toISOString(), endDate.toISOString()]
    );
    return result as Transaction[];
  }

  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | null> {
    // Build dynamic update query
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getTransaction(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString()); // Add id as the last parameter
    
    const result = await sql(
      `UPDATE transactions SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? (result[0] as Transaction) : null;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async searchTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const result = await sql(
      'SELECT * FROM transactions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate, endDate]
    );
    return result as Transaction[];
  }

  // SUPPLIERS
  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const result = await sql(
      'INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3) RETURNING *',
      [data.name, data.contactNumber || null, data.address || null]
    );
    return result[0] as Supplier;
  }

  async getSupplier(id: number): Promise<Supplier | null> {
    const result = await sql('SELECT * FROM suppliers WHERE id = $1', [id]);
    return result.length ? (result[0] as Supplier) : null;
  }

  async getSuppliers(limit?: number, offset?: number): Promise<Supplier[]> {
    if (limit && offset !== undefined) {
      const result = await sql('SELECT * FROM suppliers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return result as Supplier[];
    }
    const result = await sql('SELECT * FROM suppliers ORDER BY created_at DESC');
    return result as Supplier[];
  }

  async searchSuppliers(query: string): Promise<Supplier[]> {
    const result = await sql(
      `SELECT * FROM suppliers 
       WHERE name ILIKE $1 
       OR contact ILIKE $1 
       OR address ILIKE $1 
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    return result as Supplier[];
  }

  async updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getSupplier(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE suppliers SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? (result[0] as Supplier) : null;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async updateUser(id: number, data: any): Promise<User | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getUserById(id);
    
    // Handle password hashing if password is being updated
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, username, role, shop_id, created_at as "createdAt"`,
      values
    );
    return result.length ? (result[0] as User) : null;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // SUPPLIER PAYMENTS
  async createSupplierPayment(data: InsertSupplierPayment): Promise<SupplierPayment> {
    const result = await sql(
      'INSERT INTO supplier_payments (supplier_id, amount, payment_method, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.supplierId, data.amount, data.paymentMethod, data.description || null]
    );
    return result[0] as SupplierPayment;
  }

  // STATISTICS
  async getTodayStats(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = await sql(
      'SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE DATE(created_at) = $1',
      [today]
    );
    const todayBills = await sql(
      'SELECT COUNT(*) as count, SUM(final_amount) as total FROM bills WHERE DATE(created_at) = $1',
      [today]
    );
    
    return {
      transactions: todayTransactions[0]?.count || 0,
      revenue: todayTransactions[0]?.revenue || 0,
      bills: todayBills[0]?.count || 0,
      billsTotal: todayBills[0]?.total || 0
    };
  }

  async getWeekStats(): Promise<any> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekTransactions = await sql(
      'SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1',
      [weekAgo]
    );
    
    return {
      transactions: weekTransactions[0]?.count || 0,
      revenue: weekTransactions[0]?.revenue || 0
    };
  }

  async getMonthStats(): Promise<any> {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthTransactions = await sql(
      'SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1',
      [monthAgo]
    );
    
    return {
      transactions: monthTransactions[0]?.count || 0,
      revenue: monthTransactions[0]?.revenue || 0
    };
  }

  async getYearStats(): Promise<any> {
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const yearTransactions = await sql(
      'SELECT COUNT(*) as count, SUM(repair_cost) as revenue FROM transactions WHERE created_at >= $1',
      [yearAgo]
    );
    
    return {
      transactions: yearTransactions[0]?.count || 0,
      revenue: yearTransactions[0]?.revenue || 0
    };
  }

  async getSupplierPayments(supplierId?: number): Promise<SupplierPayment[]> {
    if (supplierId) {
      const result = await sql(
        'SELECT * FROM supplier_payments WHERE supplier_id = $1 ORDER BY created_at DESC',
        [supplierId]
      );
      return result as SupplierPayment[];
    }
    const result = await sql('SELECT * FROM supplier_payments ORDER BY created_at DESC');
    return result as SupplierPayment[];
  }

  async getSupplierPayment(id: number): Promise<SupplierPayment | null> {
    const result = await sql('SELECT * FROM supplier_payments WHERE id = $1', [id]);
    return result.length ? (result[0] as SupplierPayment) : null;
  }

  async updateSupplierPayment(id: number, data: Partial<InsertSupplierPayment>): Promise<SupplierPayment | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getSupplierPayment(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE supplier_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? (result[0] as SupplierPayment) : null;
  }

  async deleteSupplierPayment(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM supplier_payments WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // BILLS
  async createBill(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO bills (
        customer_name, customer_phone, customer_email, customer_address,
        bill_number, total_amount, tax_amount, discount_amount, final_amount,
        payment_status, payment_method, due_date, notes, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        data.customerName, data.customerPhone || null, data.customerEmail || null, data.customerAddress || null,
        data.billNumber, data.totalAmount, data.taxAmount || 0, data.discountAmount || 0, data.finalAmount,
        data.paymentStatus || 'pending', data.paymentMethod || null, data.dueDate || null, data.notes || null, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getBill(id: number): Promise<any | null> {
    const result = await sql('SELECT * FROM bills WHERE id = $1', [id]);
    return result.length ? result[0] : null;
  }

  async getBills(limit?: number, offset?: number): Promise<any[]> {
    if (limit && offset !== undefined) {
      const result = await sql('SELECT * FROM bills ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return result;
    }
    const result = await sql('SELECT * FROM bills ORDER BY created_at DESC');
    return result;
  }

  async getBillsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const result = await sql(
      'SELECT * FROM bills WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate.toISOString(), endDate.toISOString()]
    );
    return result;
  }

  async searchBills(query: string): Promise<any[]> {
    const result = await sql(
      `SELECT * FROM bills 
       WHERE customer_name ILIKE $1 
       OR bill_number ILIKE $1 
       OR customer_phone ILIKE $1 
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    return result;
  }

  async updateBill(id: number, data: any): Promise<any | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getBill(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE bills SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? result[0] : null;
  }

  async deleteBill(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM bills WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // NOTIFICATIONS
  async createNotification(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO notifications (
        title, message, type, user_id, priority, action_url, metadata, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.title, data.message, data.type || 'info', data.userId || null,
        data.priority || 'medium', data.actionUrl || null, JSON.stringify(data.metadata || {}), data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getNotifications(userId?: number): Promise<any[]> {
    if (userId) {
      const result = await sql(
        'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC',
        [userId]
      );
      return result;
    }
    const result = await sql('SELECT * FROM notifications ORDER BY created_at DESC');
    return result;
  }

  async markNotificationAsRead(id: number): Promise<any | null> {
    const result = await sql(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.length ? result[0] : null;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async searchTransactions(query: string): Promise<Transaction[]> {
    const result = await sql(
      `SELECT * FROM transactions 
       WHERE customer_name ILIKE $1 
       OR mobile_number ILIKE $1 
       OR device_model ILIKE $1 
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    return result as Transaction[];
  }

  // INVENTORY ITEMS
  async createInventoryItem(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO inventory_items (
        name, description, category, quantity, unit_price, supplier_id, sku, minimum_stock, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.name, data.description || null, data.category || null, data.quantity || 0,
        data.unitPrice || 0, data.supplierId || null, data.sku || null, data.minimumStock || 0, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getInventoryItem(id: number): Promise<any | null> {
    const result = await sql('SELECT * FROM inventory_items WHERE id = $1', [id]);
    return result.length ? result[0] : null;
  }

  async updateInventoryItem(id: number, data: any): Promise<any | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getInventoryItem(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE inventory_items SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? result[0] : null;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM inventory_items WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async searchInventoryItems(query: string): Promise<any[]> {
    const result = await sql(
      `SELECT * FROM inventory_items 
       WHERE name ILIKE $1 
       OR description ILIKE $1 
       OR category ILIKE $1 
       OR sku ILIKE $1 
       ORDER BY name`,
      [`%${query}%`]
    );
    return result;
  }

  async searchInventory(query: string): Promise<any[]> {
    return this.searchInventoryItems(query);
  }

  async getInventoryItems(limit?: number, offset?: number): Promise<any[]> {
    if (limit && offset !== undefined) {
      const result = await sql('SELECT * FROM inventory_items ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
      return result;
    }
    const result = await sql('SELECT * FROM inventory_items ORDER BY name');
    return result;
  }

  // Dashboard data
  async getDashboardData(): Promise<any> {
    // Optimized single query to get all dashboard metrics
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

  async getDashboardTotals(): Promise<any> {
    return this.getDashboardData();
  }

  async getWeeklyStatistics(): Promise<any[]> {
    // Get revenue and profit data for the last 7 days
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
    
    // Fill in missing days with zero values
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap = new Map();
    
    result.forEach((row: any) => {
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

  async getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
    const result = await sql('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
    return result as Transaction[];
  }

  async getTopSuppliers(limit: number = 5): Promise<any[]> {
    const result = await sql(
      `SELECT s.*, COUNT(sp.id) as payment_count, SUM(sp.amount) as total_paid 
       FROM suppliers s 
       LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id 
       GROUP BY s.id 
       ORDER BY total_paid DESC NULLS LAST 
       LIMIT $1`,
      [limit]
    );
    return result;
  }

  // PURCHASE ORDERS
  async createPurchaseOrder(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO purchase_orders (
        supplier_id, order_number, total_amount, status, expected_delivery, notes, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.supplierId, data.orderNumber || null, data.totalAmount || 0,
        data.status || 'pending', data.expectedDelivery || null, data.notes || null, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getPurchaseOrder(id: number): Promise<any | null> {
    const result = await sql('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    return result.length ? result[0] : null;
  }

  async getPurchaseOrders(limit?: number, offset?: number): Promise<any[]> {
    if (limit && offset !== undefined) {
      const result = await sql('SELECT * FROM purchase_orders ORDER BY order_date DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return result;
    }
    const result = await sql('SELECT * FROM purchase_orders ORDER BY order_date DESC');
    return result;
  }

  async updatePurchaseOrder(id: number, data: any): Promise<any | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.getPurchaseOrder(id);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id.toString());
    
    const result = await sql(
      `UPDATE purchase_orders SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.length ? result[0] : null;
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM purchase_orders WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // SETTINGS
  async createSetting(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO settings (
        user_id, setting_key, setting_value, setting_type, description, is_public, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.userId || null, data.settingKey, JSON.stringify(data.settingValue),
        data.settingType || 'user', data.description || null, data.isPublic || false, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getSettings(userId?: number): Promise<any[]> {
    if (userId) {
      const result = await sql(
        'SELECT * FROM settings WHERE user_id = $1 OR setting_type = \'system\' ORDER BY setting_key',
        [userId]
      );
      return result;
    }
    const result = await sql('SELECT * FROM settings ORDER BY setting_key');
    return result;
  }

  async getUserSettings(userId?: number): Promise<any[]> {
    return this.getSettings(userId);
  }

  async updateSetting(id: number, data: any): Promise<any | null> {
    const result = await sql(
      'UPDATE settings SET setting_value = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(data.settingValue), id]
    );
    return result.length ? result[0] : null;
  }

  async deleteSetting(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM settings WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  // ACTIVITY LOG
  async createActivityLog(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO activity_log (
        user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.userId || null, data.action, data.entityType, data.entityId || null,
        data.description, JSON.stringify(data.metadata || {}), data.ipAddress || null,
        data.userAgent || null, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getActivityLogs(userId?: number): Promise<any[]> {
    if (userId) {
      const result = await sql(
        'SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [userId]
      );
      return result;
    }
    const result = await sql('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100');
    return result;
  }

  async getActivityLog(userId?: number): Promise<any[]> {
    return this.getActivityLogs(userId);
  }

  // EXPENDITURES
  async getExpenditures(limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await sql(
      'SELECT * FROM expenditures ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result;
  }

  async getExpenditure(id: number): Promise<any | null> {
    const result = await sql('SELECT * FROM expenditures WHERE id = $1', [id]);
    return result.length ? result[0] : null;
  }

  async createExpenditure(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO expenditures (
        supplier_id, amount, description, category, payment_method, 
        payment_status, due_date, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.supplierId, data.amount, data.description, data.category || 'general',
        data.paymentMethod || 'cash', data.paymentStatus || 'pending',
        data.dueDate || null, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async updateExpenditure(id: number, data: any): Promise<any | null> {
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

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await sql(
      `UPDATE expenditures SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.length ? result[0] : null;
  }

  async deleteExpenditure(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM expenditures WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async getExpendituresByDateRangeForShop(shopId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const result = await sql(
      'SELECT * FROM expenditures WHERE shop_id = $1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC',
      [shopId, startDate.toISOString(), endDate.toISOString()]
    );
    return result;
  }

  // PERMISSIONS
  async getPermissions(role?: string): Promise<any[]> {
    if (role) {
      const result = await sql(
        'SELECT * FROM permissions WHERE role = $1 ORDER BY resource, action',
        [role]
      );
      return result;
    }
    const result = await sql('SELECT * FROM permissions ORDER BY role, resource, action');
    return result;
  }

  async getAllPermissions(): Promise<any[]> {
    return this.getPermissions();
  }

  async updatePermission(id: number, data: any): Promise<any | null> {
    const result = await sql(
      'UPDATE permissions SET allowed = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [data.allowed, id]
    );
    return result.length ? result[0] : null;
  }

  // GROUPED EXPENDITURES
  async createGroupedExpenditure(data: any): Promise<any> {
    const result = await sql(
      'INSERT INTO grouped_expenditures (provider_name, category, total_amount, period_start, period_end, description, status, shop_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [data.provider_name, data.category, data.total_amount, data.period_start, data.period_end, data.description, data.status || 'pending', data.shop_id || 'default']
    );
    return result[0];
  }

  async getGroupedExpenditures(limit: number = 50, offset: number = 0): Promise<any[]> {
    return await sql(
      'SELECT * FROM grouped_expenditures ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }

  async getGroupedExpenditure(id: number): Promise<any> {
    const result = await sql(
      'SELECT * FROM grouped_expenditures WHERE id = $1',
      [id]
    );
    return result[0];
  }

  async updateGroupedExpenditure(id: number, data: any): Promise<any> {
    const result = await sql(
      'UPDATE grouped_expenditures SET provider_name = COALESCE($1, provider_name), category = COALESCE($2, category), total_amount = COALESCE($3, total_amount), period_start = COALESCE($4, period_start), period_end = COALESCE($5, period_end), description = COALESCE($6, description), status = COALESCE($7, status) WHERE id = $8 RETURNING *',
      [data.provider_name, data.category, data.total_amount, data.period_start, data.period_end, data.description, data.status, id]
    );
    return result[0];
  }

  async deleteGroupedExpenditure(id: number): Promise<boolean> {
    const result = await sql(
      'DELETE FROM grouped_expenditures WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  async getGroupedExpendituresByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return await sql(
      'SELECT * FROM grouped_expenditures WHERE period_start >= $1 AND period_end <= $2 ORDER BY created_at DESC',
      [startDate, endDate]
    );
  }

  async searchGroupedExpenditures(search: string): Promise<any[]> {
    return await sql(
      'SELECT * FROM grouped_expenditures WHERE provider_name ILIKE $1 OR category ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC',
      [`%${search}%`]
    );
  }

  // GROUPED EXPENDITURE PAYMENTS
  async createGroupedExpenditurePayment(data: any): Promise<any> {
    const result = await sql(
      'INSERT INTO grouped_expenditure_payments (grouped_expenditure_id, amount, payment_method, payment_date, description, shop_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.grouped_expenditure_id, data.amount, data.payment_method, data.payment_date || new Date(), data.description, data.shop_id || 'default']
    );
    return result[0];
  }

  async getGroupedExpenditurePayments(groupedExpenditureId: number): Promise<any[]> {
    return await sql(
      'SELECT * FROM grouped_expenditure_payments WHERE grouped_expenditure_id = $1 ORDER BY payment_date DESC',
      [groupedExpenditureId]
    );
  }

  async deleteGroupedExpenditurePayment(id: number): Promise<boolean> {
    const result = await sql(
      'DELETE FROM grouped_expenditure_payments WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  // REPORTS
  async createReport(data: any): Promise<any> {
    const result = await sql(
      `INSERT INTO reports (
        name, type, description, parameters, generated_by, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.name, data.type, data.description || null, JSON.stringify(data.parameters || {}),
        data.generatedBy || null, data.shopId || 'default'
      ]
    );
    return result[0];
  }

  async getReports(startDate?: string, endDate?: string): Promise<any> {
    let query = 'SELECT * FROM transactions';
    const params: any[] = [];
    
    if (startDate && endDate) {
      query += ' WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await sql(query, params);
    return result;
  }

  async getAllReports(): Promise<any[]> {
    const result = await sql('SELECT * FROM reports ORDER BY created_at DESC');
    return result;
  }

  async getReportsByDateRange(dateRange: string): Promise<any[]> {
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
    
    const result = await sql(
      'SELECT * FROM reports WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate.toISOString(), endDate.toISOString()]
    );
    return result;
  }

  async getReport(id: number): Promise<any | null> {
    const result = await sql('SELECT * FROM reports WHERE id = $1', [id]);
    return result.length ? result[0] : null;
  }

  async updateReport(id: number, data: any): Promise<any | null> {
    const result = await sql(
      'UPDATE reports SET data = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [JSON.stringify(data.data || {}), data.status || 'completed', id]
    );
    return result.length ? result[0] : null;
  }

  async deleteReport(id: number): Promise<boolean> {
    const result = await sql('DELETE FROM reports WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }
}

// Ensure default user function - creates admin user if it doesn't exist
export async function ensureDefaultUser(username: string, password: string, role: string): Promise<void> {
  try {
    console.log(`🔍 Checking if user '${username}' exists...`);
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      console.log(`✅ User '${username}' already exists with role: ${existingUser.role}`);
      
      // Verify password is correct by comparing with expected password
      const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
      if (!isPasswordCorrect) {
        console.log(`🔄 Updating password for user '${username}'...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql(
          'UPDATE users SET password = $1 WHERE username = $2',
          [hashedPassword, username]
        );
        console.log(`✅ Password updated for user '${username}'`);
      } else {
        console.log(`✅ Password is correct for user '${username}'`);
      }
      return;
    }
    
    // Create new user if doesn't exist
    console.log(`🆕 Creating new user '${username}' with role '${role}'...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await sql(
      'INSERT INTO users (username, password, role, shop_id) VALUES ($1, $2, $3, $4)',
      [username, hashedPassword, role, 'default']
    );
    
    console.log(`✅ User '${username}' created successfully with role '${role}'`);
  } catch (error) {
    console.error(`❌ Error ensuring default user '${username}':`, error);
    // Don't throw error to prevent server startup failure
  }
}

export const storage = new DatabaseStorage();
export default storage;
