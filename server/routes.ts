// @ts-nocheck
import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import type { Server as SocketIOServer } from "socket.io";
import { requireAuth, requireRole, requireNotDemo } from './supabase-auth-middleware';
import { 
  insertTransactionSchema, 
  insertInventoryItemSchema, 
  insertSupplierSchema, 
  insertSupplierPaymentSchema, 
  insertExpenditureSchema,
  insertGroupedExpenditureSchema,
  insertGroupedExpenditurePaymentSchema
} from "../shared/schema";
import { z } from "zod";
import ExcelJS from "exceljs";
import axios from 'axios';

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

  // Weekly statistics endpoint for charts
  app.get('/api/statistics/week', async (req, res) => {
    try {
      const weeklyData = await storage.getWeeklyStatistics();
      res.json({ data: weeklyData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch weekly statistics' });
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
      // Example: Search across transactions, suppliers, inventory
      const transactionResults = await storage.searchTransactions(q);
      const supplierResults = await storage.searchSuppliers(q);
      const inventoryResults = await storage.searchInventory(q);
      res.json({ query: q, transactions: transactionResults, suppliers: supplierResults, inventory: inventoryResults });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });
  app.get('/api/statistics/today', async (req, res) => {
    try {
      const stats = await storage.getTodayStats(); // Use existing or implement in storage
      res.json({ statistics: { today: stats } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch today\'s statistics' });
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
      let transactions;
      if (search) {
        transactions = await storage.searchTransactions(search);
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
        transactions = await storage.getTransactionsByDateRange(startDate, endDate);
      } else {
        transactions = await storage.getTransactions(limit, offset);
      }
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
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

  // Inventory routes
  app.post("/api/inventory", requireNotDemo, (req, res) => {
    (async () => {
      try {
        const validatedData = insertInventoryItemSchema.parse(req.body);
        const item = await storage.createInventoryItem(validatedData);
        res.json(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation error", errors: error.errors });
        } else {
          res.status(500).json({ message: "Failed to create inventory item" });
        }
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to create inventory item" });
    });
  });

  app.get("/api/inventory", (req, res) => {
    (async () => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;

        let items;
        if (search) {
          items = await storage.searchInventoryItems(search);
        } else {
          items = await storage.getInventoryItems(limit, offset);
        }

        res.json(items);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch inventory items" });
      }
    })().catch(error => {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    });
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

        let suppliers;
        if (search) {
          suppliers = await storage.searchSuppliers(search);
        } else {
          suppliers = await storage.getSuppliers(limit, offset);
        }

        res.json(suppliers);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch suppliers" });
      }
    })().catch(error => {
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
        const expenditure = await storage.createExpenditure(validatedData);
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
        const groupedExpenditure = await storage.createGroupedExpenditure(validatedData);
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

  // --- SMS Sending Endpoint ---
  app.post('/api/send-sms', (req, res) => {
    (async () => {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Missing phone or message' });
      }
      try {
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
        res.status(500).json({ success: false, error: errMsg });
      }
    })().catch(error => {
      res.status(500).json({ success: false, error: 'Failed to send SMS' });
    });
  });

  
  // Repairs endpoints
  app.get('/api/repairs', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM repairs ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repairs' });
    }
  });

  app.post('/api/repairs', requireNotDemo, async (req, res) => {
    try {
      const { customer_name, mobile_number, device_model, issue_description, repair_type, repair_cost } = req.body;
      const result = await pool.query(
        'INSERT INTO repairs (customer_name, mobile_number, device_model, issue_description, repair_type, repair_cost) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [customer_name, mobile_number, device_model, issue_description, repair_type, repair_cost]
      );
      res.json(result.rows[0]);
      io.emit('repairCreated', result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create repair' });
    }
  });

  
  // Customers endpoints  
  app.get('/api/customers', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  app.post('/api/customers', requireNotDemo, async (req, res) => {
    try {
      const { name, mobile_number, email, address } = req.body;
      const result = await pool.query(
        'INSERT INTO customers (name, mobile_number, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, mobile_number, email, address]
      );
      res.json(result.rows[0]);
      io.emit('customerCreated', result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  
  // Analytics endpoints
  app.get('/api/analytics', async (req, res) => {
    try {
      const dateRange = req.query.range || 'week';
      let query = '';
      const params = [];
      
      switch (dateRange) {
        case 'today':
          query = `SELECT * FROM analytics WHERE date = CURRENT_DATE`;
          break;
        case 'week':
          query = `SELECT * FROM analytics WHERE date >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          query = `SELECT * FROM analytics WHERE date >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        default:
          query = `SELECT * FROM analytics ORDER BY date DESC LIMIT 30`;
      }
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // --- ALIASES FOR FRONTEND COMPATIBILITY (REVERSED) ---

  // 1. /api/sms/send forwards to /api/send-sms
  app.post('/api/sms/send', (req, res) => {
    req.url = '/api/send-sms';
    app._router.handle(req, res);
  });

  // 2. /api/suppliers/payments forwards to /api/grouped-expenditure-payments
  app.post('/api/suppliers/payments', (req, res) => {
    req.url = '/api/grouped-expenditure-payments';
    app._router.handle(req, res);
  });

  // 3. /api/statistics/* forwards to /api/stats/*
  app.get('/api/statistics/today', (req, res) => {
    req.url = '/api/stats/today';
    app._router.handle(req, res);
  });
  app.get('/api/statistics/week', (req, res) => {
    req.url = '/api/stats/week';
    app._router.handle(req, res);
  });
  app.get('/api/statistics/month', (req, res) => {
    req.url = '/api/stats/month';
    app._router.handle(req, res);
  });
  app.get('/api/statistics/year', (req, res) => {
    req.url = '/api/stats/year';
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
