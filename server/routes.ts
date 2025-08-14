// @ts-nocheck
import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import type { Server as SocketIOServer } from "socket.io";
import { requireAuth, requireRole, requireNotDemo } from './supabase-auth-middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  insertTransactionSchema, 
  insertSupplierSchema, 
  insertSupplierPaymentSchema, 
  insertExpenditureSchema,
  insertGroupedExpenditureSchema,
  insertGroupedExpenditurePaymentSchema
} from "../shared/schema";
import { z } from "zod";
import ExcelJS from "exceljs";
import axios from 'axios';

// Initialize Supabase client for direct API calls
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function registerRoutes(app: Express, io: SocketIOServer): Promise<void> {
  // Health endpoint (no auth required)
  app.get('/health', async (req, res) => {
    try {
      // Test database connection
      const result = await pool.query('SELECT NOW() as current_time');
      res.json({ 
        status: 'OK', 
        message: 'Mobile Repair Tracker Backend is running with Supabase Auth', 
        timestamp: new Date().toISOString(), 
        port: process.env.PORT || 10000,
        database: 'connected',
        dbTime: result.rows[0]?.current_time,
        auth: 'supabase'
      });
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      res.status(503).json({ 
        status: 'ERROR', 
        message: 'Mobile Repair Tracker Backend is running but database is disconnected',
        timestamp: new Date().toISOString(), 
        port: process.env.PORT || 10000,
        database: 'disconnected',
        auth: 'supabase',
        error: error.message
      });
    }
  });

  // Version endpoint (no auth required)
  app.get('/api/version', (req, res) => {
    res.json({ version: '1.0.0', name: 'Mobile Repair Tracker Backend' });
  });

  // All routes below require authentication
  app.use(requireAuth);

  // --- Restored robust stub endpoints ---
  // TODO: Implement real logic for each endpoint as needed
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifications = await storage.getNotifications(); // TODO: Implement in storage if missing
      res.json({ notifications });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/settings', async (req, res) => {
    try {
      const userId = req.user?.id; // Assuming req.user is set by auth middleware
      const settings = await storage.getUserSettings(userId); // TODO: Implement in storage if missing
      res.json({ settings });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.get('/api/activity-log', async (req, res) => {
    try {
      const logs = await storage.getActivityLog(); // TODO: Implement in storage if missing
      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });

  // Add plural version for consistency
  app.get('/api/activity-logs', async (req, res) => {
    try {
      const logs = await storage.getActivityLog();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });

  // For /api/users, /api/permissions, /api/clear-all-data, require admin/owner
  app.get('/api/users', requireRole('admin', 'owner'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // POST /api/users - Create new user
  app.post('/api/users', requireRole('admin', 'owner'), async (req, res) => {
    try {
      const { email, role = 'user', username, password } = req.body;
      
      if (!email || !username) {
        return res.status(400).json({ error: 'Email and username are required' });
      }

      // Create user in Supabase Auth (if password provided)
      if (password) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, role }
        });

        if (authError) {
          return res.status(400).json({ error: authError.message });
        }

        return res.json({ success: true, user: authUser.user });
      } else {
        // Create user record in database
        const { data: user, error } = await supabase
          .from('users')
          .insert([{ email, username, role, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) {
          return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, user });
        io.emit('userCreated', user);
      }
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.get('/api/permissions', requireRole('admin', 'owner'), async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json({ permissions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  });
  app.delete('/api/clear-all-data', requireRole('admin', 'owner'), async (req, res) => {
    // TODO: Implement data clearing logic
    res.json({ success: true });
    io.emit('dataCleared', { success: true });
  });
  app.get('/api/dashboard', async (req, res) => {
    try {
      // Example: Fetch summary data for dashboard widgets
      const totals = await storage.getDashboardTotals(); // Implement this in storage if missing
      const recentTransactions = await storage.getRecentTransactions(5);
      const topSuppliers = await storage.getTopSuppliers(5);
      res.json({ totals, recentTransactions, topSuppliers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Dashboard Stats Route (Frontend expects this)
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const totals = await storage.getDashboardTotals();
      const todayStats = await storage.getTodayStats();
      const weekStats = await storage.getWeekStats();
      res.json({ totals, today: todayStats, week: weekStats });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // Dashboard Totals Route (Alternative path for same data)
  app.get('/api/dashboard/totals', async (req, res) => {
    try {
      const totals = await storage.getDashboardTotals();
      res.json(totals);
    } catch (error) {
      console.error('Dashboard totals error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard totals' });
    }
  });

  // Recent Transactions Route
  app.get('/api/dashboard/recent-transactions', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentTransactions = await storage.getRecentTransactions(limit);
      res.json(recentTransactions);
    } catch (error) {
      console.error('Recent transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
  });

  app.get('/api/reports', async (req, res) => {
    try {
      const dateRange = req.query.dateRange as string;
      let reports;
      if (dateRange) {
        reports = await storage.getReportsByDateRange(dateRange); // Implement this in storage if missing
      } else {
        reports = await storage.getAllReports(); // Implement this in storage if missing
      }
      res.json(reports);
      io.emit('reportUpdated', reports); // Emitting all reports for now
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  // Transaction Reports Routes (Frontend expects these)
  app.get('/api/reports/transactions/today', async (req, res) => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', new Date().toDateString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Today transactions report error:', error);
        return res.status(500).json({ error: 'Failed to fetch today transactions report' });
      }

      res.json(transactions || []);
    } catch (error) {
      console.error('Today transactions report route error:', error);
      res.status(500).json({ error: 'Failed to fetch today transactions report' });
    }
  });

  app.get('/api/reports/transactions/week', async (req, res) => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Week transactions report error:', error);
        return res.status(500).json({ error: 'Failed to fetch week transactions report' });
      }

      res.json(transactions || []);
    } catch (error) {
      console.error('Week transactions report route error:', error);
      res.status(500).json({ error: 'Failed to fetch week transactions report' });
    }
  });

  app.get('/api/reports/transactions/month', async (req, res) => {
    try {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', monthAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Month transactions report error:', error);
        return res.status(500).json({ error: 'Failed to fetch month transactions report' });
      }

      res.json(transactions || []);
    } catch (error) {
      console.error('Month transactions report route error:', error);
      res.status(500).json({ error: 'Failed to fetch month transactions report' });
    }
  });

  // Activity Log Route (Different from activity-log)
  app.get('/api/activity', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const { data: activities, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Activity log error:', error);
        return res.status(500).json({ error: 'Failed to fetch activity log' });
      }

      res.json(activities || []);
    } catch (error) {
      console.error('Activity route error:', error);
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });
  app.get('/api/bills', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const dateRange = req.query.dateRange as string;
      let bills;
      if (search) {
        bills = await storage.searchBills(search);
      } else if (dateRange) {
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
        bills = await storage.getBillsByDateRange(startDate, endDate);
      } else {
        bills = await storage.getBills(limit, offset);
      }
      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });
  // --- Bill Create Endpoint ---
  app.post('/api/bills', requireNotDemo, async (req, res) => {
    try {
      const bill = await storage.createBill(req.body);
      res.json({ success: true, data: bill, message: 'Bill created successfully' });
      io.emit('billCreated', bill);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create bill', details: error?.message || error });
      io.emit('error', { type: 'bill', message: 'Failed to create bill', details: error?.message || error });
    }
  });
  // --- Bill Update Endpoint ---
  app.put('/api/bills/:id', requireNotDemo, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bill = await storage.updateBill(id, req.body);
      if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });
      res.json({ success: true, data: bill, message: 'Bill updated successfully' });
      io.emit('billUpdated', bill);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update bill', details: error?.message || error });
      io.emit('error', { type: 'bill', message: 'Failed to update bill', details: error?.message || error });
    }
  });
  // --- Bill Delete Endpoint ---
  app.delete('/api/bills/:id', requireNotDemo, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBill(id);
      if (!success) return res.status(404).json({ success: false, error: 'Bill not found' });
      res.json({ success: true, message: 'Bill deleted successfully' });
      io.emit('billDeleted', id);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete bill', details: error?.message || error });
      io.emit('error', { type: 'bill', message: 'Failed to delete bill', details: error?.message || error });
    }
  });
  app.get('/api/search', async (req, res) => {
    try {
      const q = req.query.q as string || '';
      // Example: Search across transactions, suppliers
      const transactionResults = await storage.searchTransactions(q);
      const supplierResults = await storage.searchSuppliers(q);
      res.json({ query: q, transactions: transactionResults, suppliers: supplierResults });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });


  // --- Transaction Endpoints ---

  // Create a transaction
  app.post("/api/transactions", requireNotDemo, async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      // Expenditure entries are automatically created in storage.createTransaction
      res.json({ success: true, data: transaction, message: 'Transaction created successfully' });
      io.emit("transactionCreated", transaction);
    } catch (error) {
      console.error('Transaction creation error:', error); // Added detailed error logging
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ success: false, error: 'Failed to create transaction', details: error?.message || error });
      }
      io.emit('error', { type: 'transaction', message: 'Failed to create transaction', details: error?.message || error });
    }
  });

  // Get all transactions (with optional search/dateRange)
  app.get("/api/transactions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const dateRange = req.query.dateRange as string;
      
      let query = supabase.from('transactions').select('*');
      
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%, mobile_number.ilike.%${search}%, device_model.ilike.%${search}%, repair_type.ilike.%${search}%`);
      } else if (dateRange) {
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
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }
      
      const { data: transactions, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Transactions fetch error:', error);
        return res.status(500).json({ message: "Failed to fetch transactions" });
      }

      res.json(transactions || []);
    } catch (error) {
      console.error('Transactions route error:', error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Transaction Search Route (MUST be before :id route)
  app.get("/api/transactions/search", async (req, res) => {
      try {
        const q = req.query.q as string;
        if (!q) {
          return res.status(400).json({ message: "Search query parameter 'q' is required" });
        }
        
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .ilike('customer_name', `%${q}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Transaction search error:', error);
          return res.status(500).json({ message: "Failed to search transactions" });
        }

        res.json(transactions || []);
      } catch (error) {
        console.error('Transaction search route error:', error);
        res.status(500).json({ message: "Failed to search transactions" });
      }
  });

  // Get a single transaction by ID
  app.get("/api/transactions/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid transaction ID" });
        const transaction = await storage.getTransaction(id);
        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        res.json(transaction);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch transaction" });
      }
  });

  // Update a transaction by ID
  app.put("/api/transactions/:id", requireNotDemo, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid transaction ID" });
        const validatedData = insertTransactionSchema.partial().parse(req.body);
        const transaction = await storage.updateTransaction(id, validatedData);
        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        res.json({ success: true, data: transaction, message: 'Transaction updated successfully' });
        io.emit("transactionUpdated", transaction);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to update transaction', details: error?.message || error });
        }
        io.emit('error', { type: 'transaction', message: 'Failed to update transaction', details: error?.message || error });
      }
  });

  // Delete a transaction by ID
  app.delete("/api/transactions/:id", requireNotDemo, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid transaction ID" });
        const success = await storage.deleteTransaction(id);
        if (!success) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        res.json({ success: true, message: "Transaction deleted successfully" });
        io.emit("transactionDeleted", id);
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete transaction', details: error?.message || error });
        io.emit('error', { type: 'transaction', message: 'Failed to delete transaction', details: error?.message || error });
      }
  });

  // --- Statistics Endpoints ---

  app.get("/api/stats/today", async (req, res) => {
      try {
        const stats = await storage.getTodayStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch today's stats" });
      }
  });

  app.get("/api/stats/week", async (req, res) => {
      try {
        const stats = await storage.getWeekStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch week's stats" });
      }
  });

  app.get("/api/stats/month", async (req, res) => {
      try {
        const stats = await storage.getMonthStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch month's stats" });
      }
  });

  app.get("/api/stats/year", async (req, res) => {
      try {
        const stats = await storage.getYearStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch year's stats" });
      }
  });

  // Transaction Statistics Routes (Frontend expects these paths)
  app.get("/api/transactions/stats/today", async (req, res) => {
      try {
        const stats = await storage.getTodayStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch today's stats" });
      }
  });

  app.get("/api/transactions/stats/week", async (req, res) => {
      try {
        const stats = await storage.getWeekStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch week's stats" });
      }
  });

  app.get("/api/transactions/stats/month", async (req, res) => {
      try {
        const stats = await storage.getMonthStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch month's stats" });
      }
  });

  app.get("/api/transactions/stats/year", async (req, res) => {
      try {
        const stats = await storage.getYearStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch year's stats" });
      }
  });

  // Supplier routes
  app.post("/api/suppliers", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const validatedData = insertSupplierSchema.parse(req.body);
        const supplier = await storage.createSupplier(validatedData);
        res.json(supplier);
        io.emit("supplierCreated", supplier);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation error", errors: error.errors });
        } else {
          res.status(500).json({ message: "Failed to create supplier" });
        }
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to create supplier" });
    });
  });

  app.get("/api/suppliers", (req, res) => {
    (async () => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;

        let query = supabase.from('suppliers').select('*');
        
        if (search) {
          query = query.or(`name.ilike.%${search}%, contact_number.ilike.%${search}%`);
        }
        
        const { data: suppliers, error } = await query
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Suppliers fetch error:', error);
          return res.status(500).json({ message: "Failed to fetch suppliers" });
        }

        res.json(suppliers || []);
      } catch (error) {
        console.error('Suppliers route error:', error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
      }
    })().catch(error => {
      console.error('Suppliers route exception:', error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    });
  });

  // --- Supplier Update Endpoint ---
  app.put("/api/suppliers/:id", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const validatedData = insertSupplierSchema.partial().parse(req.body);
        const supplier = await storage.updateSupplier(id, validatedData);
        if (!supplier) return res.status(404).json({ message: "Supplier not found" });
        res.json(supplier);
        io.emit("supplierUpdated", supplier);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation error", errors: error.errors });
        } else {
          res.status(500).json({ message: "Failed to update supplier" });
        }
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to update supplier" });
    });
  });
  // --- Supplier Delete Endpoint ---
  app.delete("/api/suppliers/:id", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteSupplier(id);
        if (!success) return res.status(404).json({ message: "Supplier not found" });
        res.json({ message: "Supplier deleted successfully" });
        io.emit("supplierDeleted", id);
      } catch (error) {
        res.status(500).json({ message: "Failed to delete supplier" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to delete supplier" });
    });
  });

  // Supplier payment routes
  app.post("/api/supplier-payments", (req, res) => {
    (async () => {
      try {
        const validatedData = insertSupplierPaymentSchema.parse(req.body);
        const payment = await storage.createSupplierPayment(validatedData);
        res.json({ success: true, data: payment, message: 'Payment created successfully' });
        io.emit("paymentCreated", payment);
        // Emit real-time event
        io.emit("supplierPaymentMade", payment);
        // Optionally emit supplier summary changed
        const summary = await storage.getSupplierExpenditureSummary();
        io.emit("supplierSummaryChanged", summary);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
        }
        io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
      io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
    });
  });

  app.get("/api/supplier-payments", (req, res) => {
    (async () => {
      try {
        const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
        const payments = await storage.getSupplierPayments(supplierId);
        res.json(payments);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch supplier payments" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch supplier payments" });
    });
  });

  // Purchase order routes
  app.get("/api/purchase-orders", (req, res) => {
    (async () => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const orders = await storage.getPurchaseOrders(limit, offset);
        res.json(orders);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch purchase orders" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    });
  });

  // Expenditure routes
  app.post("/api/expenditures", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const validatedData = insertExpenditureSchema.parse(req.body);
        
        // Map camelCase to snake_case for database
        const dbData = {
          ...validatedData,
          payment_method: validatedData.paymentMethod,
          paid_amount: validatedData.paidAmount,
          remaining_amount: validatedData.remainingAmount
        };
        
        const expenditure = await storage.createExpenditure(dbData);
        res.json({ success: true, data: expenditure, message: 'Expenditure created successfully' });
        io.emit("expenditureCreated", expenditure);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to create expenditure', details: error?.message || error });
        }
        io.emit('error', { type: 'expenditure', message: 'Failed to create expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to create expenditure', details: error?.message || error });
      io.emit('error', { type: 'expenditure', message: 'Failed to create expenditure', details: error?.message || error });
    });
  });

  app.get("/api/expenditures", (req, res) => {
    (async () => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;
        const dateRange = req.query.dateRange as string;

        let expenditures;

        if (search) {
          expenditures = await storage.getExpenditures(limit, offset);
        } else if (dateRange) {
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

          expenditures = await storage.getExpenditures(limit, offset);
        } else {
          expenditures = await storage.getExpenditures(limit, offset);
        }

        res.json(expenditures);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch expenditures" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch expenditures" });
    });
  });

  // --- Expenditure Update Endpoint ---
  app.put("/api/expenditures/:id", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const validatedData = insertExpenditureSchema.partial().parse(req.body);
        const expenditure = await storage.updateExpenditure(id, validatedData);
        if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
        res.json({ success: true, data: expenditure, message: 'Expenditure updated successfully' });
        io.emit("expenditureUpdated", expenditure);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to update expenditure', details: error?.message || error });
        }
        io.emit('error', { type: 'expenditure', message: 'Failed to update expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to update expenditure', details: error?.message || error });
      io.emit('error', { type: 'expenditure', message: 'Failed to update expenditure', details: error?.message || error });
    });
  });

  app.delete("/api/expenditures/:id", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteExpenditure(id);
        
        if (!success) {
          return res.status(404).json({ message: "Expenditure not found" });
        }
        
        res.json({ success: true, message: "Expenditure deleted successfully" });
        // Emit real-time event
        io.emit("expenditureDeleted", id);
        // Optionally emit supplier summary changed
        const summary = await storage.getSupplierExpenditureSummary();
        io.emit("supplierSummaryChanged", summary);
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete expenditure', details: error?.message || error });
        io.emit('error', { type: 'expenditure', message: 'Failed to delete expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to delete expenditure', details: error?.message || error });
      io.emit('error', { type: 'expenditure', message: 'Failed to delete expenditure', details: error?.message || error });
    });
  });

  // Get supplier expenditure summary
  app.get("/api/expenditures/supplier-summary", (req, res) => {
    (async () => {
      try {
        const summary = await storage.getSupplierExpenditureSummary();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ message: "Failed to get supplier summary" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to get supplier summary" });
    });
  });

  // Record payment to supplier
  app.post("/api/expenditures/supplier-payment", (req, res) => {
    (async () => {
      try {
        const { supplier, amount, paymentMethod, description } = req.body;
        
        if (!supplier || !amount || !paymentMethod) {
          return res.status(400).json({ success: false, error: 'Supplier, amount, and payment method are required' });
        }
        
        const result = await storage.createSupplierPayment({ supplierId: parseInt(supplier), amount, paymentMethod, description });
        
        if (result) {
          res.json({ 
            success: true, 
            data: { 
              supplierId: parseInt(supplier), 
              amount, 
              paymentMethod, 
              description, 
              remainingPayment: 0,
              message: `Payment of â‚¹${amount} recorded for ${supplier}`
            },
            message: `Payment of â‚¹${amount} recorded for ${supplier}`
          });
          // Emit real-time event
          io.emit("supplierPaymentMade", { supplierId: parseInt(supplier), amount, paymentMethod, description });
          // Optionally emit supplier summary changed
          const summary = await storage.getSupplierExpenditureSummary();
          io.emit("supplierSummaryChanged", summary);
        } else {
          res.status(500).json({ success: false, error: 'Failed to record payment', details: 'Failed to record payment' });
          io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: 'Failed to record payment' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
        io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
      io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
    });
  });

  // Reports export endpoint
  app.get("/api/reports/export", (req, res) => {
    (async () => {
      try {
        const reportType = req.query.type as string || "overview";
        const dateRange = req.query.dateRange as string || "month";
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`${reportType}-${dateRange}`);

        // Get data based on date range
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

        // Get transactions for the date range
        const transactions = await storage.getTransactions(1000, 0); // Get all transactions
        const filteredTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.createdAt);
          return transactionDate >= startDate && transactionDate <= endDate;
        });

        // Add headers
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Customer Name', key: 'customerName', width: 20 },
          { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
          { header: 'Device Model', key: 'deviceModel', width: 20 },
          { header: 'Repair Type', key: 'repairType', width: 15 },
          { header: 'Repair Cost', key: 'repairCost', width: 15 },
          { header: 'Actual Cost', key: 'actualCost', width: 15 },
          { header: 'Profit', key: 'profit', width: 15 },
          { header: 'Amount Given', key: 'amountGiven', width: 15 },
          { header: 'Change Returned', key: 'changeReturned', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Add data
        filteredTransactions.forEach(transaction => {
          worksheet.addRow({
            id: transaction.id,
            customerName: transaction.customerName,
            mobileNumber: transaction.mobileNumber,
            deviceModel: transaction.deviceModel,
            repairType: transaction.repairType,
            repairCost: transaction.repairCost,
            actualCost: transaction.actualCost,
            profit: transaction.profit,
            amountGiven: transaction.amountGiven,
            changeReturned: transaction.changeReturned,
            status: transaction.status,
            createdAt: transaction.createdAt.toLocaleDateString()
          });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${dateRange}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
      } catch (error) {
        res.status(500).json({ message: "Failed to generate report" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to generate report" });
    });
  });

  app.get("/api/export/excel", async (req, res) => {
    try {
      const transactions = await storage.getTransactions(1000, 0); // Export up to 1000 records
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');
      // Define columns
      worksheet.columns = [
        { header: 'Date & Time', key: 'createdAt', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
        { header: 'Device Model', key: 'deviceModel', width: 25 },
        { header: 'Repair Type', key: 'repairType', width: 20 },
        { header: 'Repair Cost', key: 'repairCost', width: 12 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
        { header: 'Amount Given', key: 'amountGiven', width: 12 },
        { header: 'Change Returned', key: 'changeReturned', width: 15 },
        { header: 'Profit', key: 'profit', width: 12 },
        { header: 'Free Glass', key: 'freeGlassInstallation', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ];
      // Add data
      transactions.forEach(transaction => {
        // Calculate profit as Repair Cost - External Purchase Costs
        let externalCost = 0;
        if (transaction.partsCost) {
          try {
            const parts = JSON.parse(transaction.partsCost);
            if (Array.isArray(parts)) {
              externalCost = parts.reduce((sum, part) => sum + (parseFloat(part.cost) || 0), 0);
            }
          } catch {}
        }
        const profit = parseFloat(transaction.repairCost) - externalCost;
        worksheet.addRow({
          createdAt: transaction.createdAt.toLocaleString(),
          customerName: transaction.customerName,
          mobileNumber: transaction.mobileNumber,
          deviceModel: transaction.deviceModel,
          repairType: transaction.repairType,
          repairCost: `â‚¹${transaction.repairCost}`,
          paymentMethod: transaction.paymentMethod,
          amountGiven: `â‚¹${transaction.amountGiven}`,
          changeReturned: `â‚¹${transaction.changeReturned}`,
          profit: `â‚¹${profit}`,
          freeGlassInstallation: transaction.freeGlassInstallation ? 'Yes' : 'No',
          status: transaction.status,
          remarks: transaction.remarks || '',
        });
      });
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      };
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  // Grouped Expenditures routes
  app.post("/api/grouped-expenditures", (req, res) => {
    (async () => {
      try {
        const validatedData = insertGroupedExpenditureSchema.parse(req.body);
        
        // Map camelCase to snake_case for database
        const dbData = {
          ...validatedData,
          provider_name: validatedData.providerName,
          total_amount: validatedData.totalAmount,
          period_start: validatedData.periodStart,
          period_end: validatedData.periodEnd
        };
        
        const groupedExpenditure = await storage.createGroupedExpenditure(dbData);
        res.json({ success: true, data: groupedExpenditure, message: 'Grouped expenditure created successfully' });
        io.emit('groupedExpenditureCreated', groupedExpenditure);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to create grouped expenditure', details: error?.message || error });
        }
        io.emit('error', { type: 'groupedExpenditure', message: 'Failed to create grouped expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to create grouped expenditure', details: error?.message || error });
      io.emit('error', { type: 'groupedExpenditure', message: 'Failed to create grouped expenditure', details: error?.message || error });
    });
  });

  app.get("/api/grouped-expenditures", (req, res) => {
    (async () => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;
        const dateRange = req.query.dateRange as string;
        let groupedExpenditures;
        if (search) {
          groupedExpenditures = await storage.searchGroupedExpenditures(search);
        } else if (dateRange) {
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
          groupedExpenditures = await storage.getGroupedExpendituresByDateRange(startDate, endDate);
        } else {
          groupedExpenditures = await storage.getGroupedExpenditures(limit, offset);
        }
        res.json(groupedExpenditures);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch grouped expenditures" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch grouped expenditures" });
    });
  });

  app.get("/api/grouped-expenditures/:id", (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const groupedExpenditure = await storage.getGroupedExpenditure(id);
        
        if (!groupedExpenditure) {
          return res.status(404).json({ message: "Grouped expenditure not found" });
        }
        
        res.json(groupedExpenditure);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch grouped expenditure" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch grouped expenditure" });
    });
  });

  app.put("/api/grouped-expenditures/:id", (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const validatedData = insertGroupedExpenditureSchema.partial().parse(req.body);
        
        const groupedExpenditure = await storage.updateGroupedExpenditure(id, validatedData);
        
        if (!groupedExpenditure) {
          return res.status(404).json({ message: "Grouped expenditure not found" });
        }
        
        res.json({ success: true, data: groupedExpenditure, message: 'Grouped expenditure updated successfully' });
        io.emit('groupedExpenditureUpdated', groupedExpenditure);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to update grouped expenditure', details: error?.message || error });
        }
        io.emit('error', { type: 'groupedExpenditure', message: 'Failed to update grouped expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to update grouped expenditure', details: error?.message || error });
      io.emit('error', { type: 'groupedExpenditure', message: 'Failed to update grouped expenditure', details: error?.message || error });
    });
  });

  app.delete("/api/grouped-expenditures/:id", (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteGroupedExpenditure(id);
        
        if (!success) {
          return res.status(404).json({ message: "Grouped expenditure not found" });
        }
        
        res.json({ success: true, message: "Grouped expenditure deleted successfully" });
        io.emit('groupedExpenditureDeleted', id);
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete grouped expenditure', details: error?.message || error });
        io.emit('error', { type: 'groupedExpenditure', message: 'Failed to delete grouped expenditure', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to delete grouped expenditure', details: error?.message || error });
      io.emit('error', { type: 'groupedExpenditure', message: 'Failed to delete grouped expenditure', details: error?.message || error });
    });
  });

  // Grouped Expenditure Payments routes
  app.post("/api/grouped-expenditure-payments", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const validatedData = insertGroupedExpenditurePaymentSchema.parse(req.body);
        const payment = await storage.createGroupedExpenditurePayment(validatedData);
        res.json({ success: true, data: payment, message: 'Payment created successfully' });
        io.emit('groupedExpenditurePaymentCreated', payment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ success: false, error: 'Failed to create payment', details: error?.message || error });
        }
        io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to create payment', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to create payment', details: error?.message || error });
      io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to create payment', details: error?.message || error });
    });
  });

  app.get("/api/grouped-expenditure-payments/:groupedExpenditureId", (req, res) => {
    (async () => {
      try {
        const groupedExpenditureId = parseInt(req.params.groupedExpenditureId);
        const payments = await storage.getGroupedExpenditurePayments(groupedExpenditureId);
        res.json(payments);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payments" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch payments" });
    });
  });

  app.delete("/api/grouped-expenditure-payments/:id", (req, res) => {
    (async () => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteGroupedExpenditurePayment(id);
        
        if (!success) {
          return res.status(404).json({ message: "Payment not found" });
        }
        
        res.json({ success: true, message: "Payment deleted successfully" });
        io.emit('groupedExpenditurePaymentDeleted', id);
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete payment', details: error?.message || error });
        io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to delete payment', details: error?.message || error });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to delete payment', details: error?.message || error });
      io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to delete payment', details: error?.message || error });
    });
  });

  // Grouped Expenditure Summary
  app.get("/api/grouped-expenditures/summary", (req, res) => {
    (async () => {
      try {
        const summary = await storage.getGroupedExpenditures(50, 0); // Changed from getGroupedExpenditureSummary
        res.json(summary);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch grouped expenditure summary" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch grouped expenditure summary" });
    });
  });

  app.post('/api/expenditures/clear', (req, res) => {
    res.status(200).json({ message: 'Not implemented' });
  });

  app.post('/api/supplier-payments/clear', (req, res) => {
    res.status(200).json({ message: 'Not implemented' });
  });

  app.post('/api/transactions/clear', (req, res) => {
    res.status(200).json({ message: 'Not implemented' });
  });



  
  // Repairs endpoints (FIXED - using Supabase)
  app.get('/api/repairs', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error('Repairs fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch repairs' });
    }
  });

  app.post('/api/repairs', requireNotDemo, async (req, res) => {
    try {
      const { customer_name, mobile_number, device_model, issue_description, repair_type, repair_cost } = req.body;
      
      // Find customer by phone if provided
      let customer_id = null;
      if (mobile_number) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', mobile_number)
          .single();
        customer_id = customer?.id || null;
      }
      
      const { data, error } = await supabase
        .from('repairs')
        .insert({
          customer_id,
          device_type: device_model || 'Unknown Device', // Map device_model to device_type
          model: repair_type || 'General Repair', // Use repair_type as model
          issue_description,
          estimated_cost: repair_cost,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      res.json(data);
      io.emit('repairCreated', data);
    } catch (error) {
      console.error('Repair creation error:', error);
      res.status(500).json({ error: 'Failed to create repair' });
    }
  });

  
  // Customers endpoints (FIXED - using Supabase)  
  app.get('/api/customers', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error('Customers fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  app.post('/api/customers', requireNotDemo, async (req, res) => {
    try {
      const { name, mobile_number, email, address } = req.body;
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone: mobile_number, // Fix: use 'phone' column instead of 'mobile_number'
          email,
          address
        })
        .select()
        .single();
        
      if (error) throw error;
      
      res.json(data);
      io.emit('customerCreated', data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  
  // Analytics endpoints (FIXED - simplified)
  app.get('/api/analytics', async (req, res) => {
    try {
      // Return basic analytics from existing tables since analytics table may not exist
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      const { data: repairs, error: repairError } = await supabase
        .from('repairs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      const analytics = {
        transactions: transactions || [],
        repairs: repairs || [],
        summary: {
          total_transactions: transactions?.length || 0,
          total_repairs: repairs?.length || 0,
          date: new Date().toISOString()
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // --- MISSING INDIVIDUAL RESOURCE ENDPOINTS ---

  // Supplier expenditure summary endpoint (must come BEFORE /api/suppliers/:id)
  app.get('/api/suppliers/expenditure-summary', async (req, res) => {
    try {
      const summary = await storage.getSupplierExpenditureSummary();
      res.json(summary);
    } catch (error) {
      console.error('Supplier expenditure summary error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier expenditure summary' });
    }
  });

  // Get individual supplier by ID (Frontend needs this)
  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid supplier ID" });
      
      // Use Supabase directly for reliability
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Supplier fetch error:', error);
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error('Get supplier error:', error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  // Get individual customer by ID (Frontend needs this)
  app.get('/api/customers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid customer ID" });
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Customer fetch error:', error);
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // SMS Send Endpoint (Frontend expects /api/sms/send)
  app.post('/api/sms/send', async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Missing phone or message' });
      }
      
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'SMS API key not configured' });
      }
      
      const fast2smsUrl = 'https://www.fast2sms.com/dev/bulkV2';
      const payload = {
        route: 'q',
        numbers: phone,
        message: message,
        language: 'english',
        flash: 0
      };
      
      const response = await axios.post(fast2smsUrl, payload, {
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      res.json({ success: true, data: response.data });
    } catch (error: any) {
      const errMsg = error.response?.data || error.message || 'Failed to send SMS';
      console.error('SMS send error:', error);
      res.status(500).json({ success: false, error: errMsg });
    }
  });

  // --- FRONTEND EXPECTED STATISTICS ENDPOINTS ---

  // Statistics endpoints (Frontend expects these exact paths)
  app.get('/api/statistics/today', async (req, res) => {
    try {
      const stats = await storage.getTodayStats();
      res.json(stats);
    } catch (error) {
      console.error('Today stats error:', error);
      res.status(500).json({ error: 'Failed to fetch today\'s statistics' });
    }
  });

  app.get('/api/statistics/week', async (req, res) => {
    try {
      const stats = await storage.getWeeklyStatistics();
      res.json({ data: stats });
    } catch (error) {
      console.error('Weekly stats error:', error);
      res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }
  });

  app.get('/api/statistics/month', async (req, res) => {
    try {
      const stats = await storage.getMonthStats();
      res.json(stats);
    } catch (error) {
      console.error('Monthly stats error:', error);
      res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
  });

  app.get('/api/statistics/year', async (req, res) => {
    try {
      const stats = await storage.getYearStats();
      res.json(stats);
    } catch (error) {
      console.error('Yearly stats error:', error);
      res.status(500).json({ error: 'Failed to fetch yearly statistics' });
    }
  });

  // Supplier payments endpoint for frontend compatibility
  app.post('/api/suppliers/payments', requireNotDemo, async (req, res) => {
    try {
      const payment = await storage.createSupplierPayment(req.body);
      res.json({ success: true, data: payment, message: 'Payment created successfully' });
      io.emit("paymentCreated", payment);
    } catch (error) {
      console.error('Supplier payment error:', error);
      res.status(500).json({ success: false, error: 'Failed to create payment', details: error?.message || error });
    }
  });

  // --- ALIASES FOR BACKWARD COMPATIBILITY ---

  // Alias /api/stats/* to /api/statistics/* for backward compatibility
  app.get('/api/stats/today', (req, res) => {
    req.url = '/api/statistics/today';
    app._router.handle(req, res);
  });
  app.get('/api/stats/week', (req, res) => {
    req.url = '/api/statistics/week';  
    app._router.handle(req, res);
  });
  app.get('/api/stats/month', (req, res) => {
    req.url = '/api/statistics/month';
    app._router.handle(req, res);
  });
  app.get('/api/stats/year', (req, res) => {
    req.url = '/api/statistics/year';
    app._router.handle(req, res);
  });

  // 1. Backup all shop data
  app.get('/api/backup', (req, res) => {
    (async () => {
      try {
        const shop_id = req.query.shop_id as string;
        if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
        const data = await storage.backupShopData(shop_id);
        res.json(data);
      } catch (e) {
        res.status(500).json({ error: 'Backup failed' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Backup failed' });
    });
  });
  
  // Restore all shop data
  app.post('/api/restore', (req, res) => {
    (async () => {
      try {
        const shop_id = req.body.shop_id;
        const data = req.body.data;
        if (!shop_id || !data) return res.status(400).json({ error: 'shop_id and data required' });
        await storage.restoreShopData(shop_id, data);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: 'Restore failed' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Restore failed' });
    });
  });
  
  // 2. Fetch transactions, bills, expenses for custom date range
  app.get('/api/transactions/range', (req, res) => {
    (async () => {
      try {
        const shop_id = req.query.shop_id as string;
        const start = req.query.start as string;
        const end = req.query.end as string;
        if (!shop_id || !start || !end) return res.status(400).json({ error: 'shop_id, start, end required' });
        const tx = await storage.getTransactionsByDateRangeForShop(shop_id, new Date(start), new Date(end));
        res.json(tx);
      } catch (e) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    });
  });
  
  app.get('/api/bills/range', (req, res) => {
    (async () => {
      try {
        const shop_id = req.query.shop_id as string;
        const start = req.query.start as string;
        const end = req.query.end as string;
        if (!shop_id || !start || !end) return res.status(400).json({ error: 'shop_id, start, end required' });
        const bills = await storage.getBillsByDateRangeForShop(shop_id, new Date(start), new Date(end));
        res.json(bills);
      } catch (e) {
        res.status(500).json({ error: 'Failed to fetch bills' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Failed to fetch bills' });
    });
  });
  
  app.get('/api/expenditures/range', (req, res) => {
    (async () => {
      try {
        const shop_id = req.query.shop_id as string;
        const start = req.query.start as string;
        const end = req.query.end as string;
        if (!shop_id || !start || !end) return res.status(400).json({ error: 'shop_id, start, end required' });
        const exps = await storage.getExpendituresByDateRangeForShop(shop_id, new Date(start), new Date(end));
        res.json(exps);
      } catch (e) {
        res.status(500).json({ error: 'Failed to fetch expenditures' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Failed to fetch expenditures' });
    });
  });
  
  // 3. Feedback endpoints
  app.post('/api/feedback', (req, res) => {
    (async () => {
      try {
        const { billId, feedback } = req.body;
        if (!billId || !feedback) return res.status(400).json({ error: 'billId and feedback required' });
        await storage.saveFeedback(billId, feedback);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: 'Failed to save feedback' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Failed to save feedback' });
    });
  });
  
  app.get('/api/feedback/:billId', (req, res) => {
    (async () => {
      try {
        const billId = req.params.billId;
        const feedback = await storage.getFeedback(billId);
        res.json({ feedback });
      } catch (e) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
      }
    })().catch(error => {
      res.status(500).json({ error: 'Failed to fetch feedback' });
    });
  });
  
  // 4. Today's and yesterday's sales/profit - remove duplicates since they already exist above
  // The existing stats routes at lines 153-192 already handle these endpoints


  // --- MISSING DASHBOARD ENDPOINTS ---
  
  // Dashboard totals endpoint
  app.get('/api/dashboard/totals', async (req, res) => {
    try {
      const totals = await storage.getDashboardTotals();
      res.json(totals);
    } catch (error) {
      console.error('Dashboard totals error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard totals' });
    }
  });

  // Dashboard weekly statistics
  app.get('/api/dashboard/weekly-statistics', async (req, res) => {
    try {
      const weeklyStats = await storage.getWeeklyStatistics();
      res.json(weeklyStats);
    } catch (error) {
      console.error('Weekly statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }
  });

  // Dashboard recent transactions
  app.get('/api/dashboard/recent-transactions', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const transactions = await storage.getRecentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error('Recent transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
  });

  // Dashboard top suppliers
  app.get('/api/dashboard/top-suppliers', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const suppliers = await storage.getTopSuppliers(limit);
      res.json(suppliers);
    } catch (error) {
      console.error('Top suppliers error:', error);
      res.status(500).json({ error: 'Failed to fetch top suppliers' });
    }
  });

  // --- MISSING USER SETTINGS ENDPOINT ---
  
  app.get('/api/user-settings', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error('User settings error:', error);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  });

  // --- MISSING SEARCH ENDPOINTS ---
  
  app.get('/api/search/transactions', async (req, res) => {
    try {
      const q = req.query.q as string || '';
      const results = await storage.searchTransactions(q);
      res.json(results);
    } catch (error) {
      console.error('Search transactions error:', error);
      res.status(500).json({ error: 'Failed to search transactions' });
    }
  });

  app.get('/api/search/suppliers', async (req, res) => {
    try {
      const q = req.query.q as string || '';
      const results = await storage.searchSuppliers(q);
      res.json(results);
    } catch (error) {
      console.error('Search suppliers error:', error);
      res.status(500).json({ error: 'Failed to search suppliers' });
    }
  });

  // --- MISSING REPORTS ENDPOINTS ---
  
  app.get('/api/reports/date-range', async (req, res) => {
    try {
      const range = req.query.range as string;
      const reports = await storage.getReportsByDateRange(range);
      res.json(reports);
    } catch (error) {
      console.error('Date range reports error:', error);
      res.status(500).json({ error: 'Failed to fetch date range reports' });
    }
  });

  // --- Health and Ping Endpoints ---
  app.get('/api/ping', (req, res) => {
    res.json({
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 10000
    });
  });
}

export { registerRoutes };
