"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const storage_1 = require("./storage");
const db_1 = require("./db");
const supabase_auth_middleware_1 = require("./supabase-auth-middleware");
const supabase_js_1 = require("@supabase/supabase-js");
const schema_1 = require("../shared/schema");
const zod_1 = require("zod");
const exceljs_1 = __importDefault(require("exceljs"));
const axios_1 = __importDefault(require("axios"));
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function registerRoutes(app, io) {
    app.get('/health', async (req, res) => {
        try {
            const result = await db_1.pool.query('SELECT NOW() as current_time');
            res.json({
                status: 'OK',
                message: 'Mobile Repair Tracker Backend is running with Supabase Auth',
                timestamp: new Date().toISOString(),
                port: process.env.PORT || 10000,
                database: 'connected',
                dbTime: result.rows[0]?.current_time,
                auth: 'supabase'
            });
        }
        catch (error) {
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
    app.get('/api/version', (req, res) => {
        res.json({ version: '1.0.0', name: 'Mobile Repair Tracker Backend' });
    });
    app.use(supabase_auth_middleware_1.requireAuth);
    app.get('/api/notifications', async (req, res) => {
        try {
            const notifications = await storage_1.storage.getNotifications();
            res.json({ notifications });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    });
    app.get('/api/settings', async (req, res) => {
        try {
            const userId = req.user?.id;
            const settings = await storage_1.storage.getUserSettings(userId);
            res.json({ settings });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    });
    app.get('/api/activity-log', async (req, res) => {
        try {
            const logs = await storage_1.storage.getActivityLog();
            res.json({ logs });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch activity log' });
        }
    });
    app.get('/api/activity-logs', async (req, res) => {
        try {
            const logs = await storage_1.storage.getActivityLog();
            res.json(logs);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch activity logs' });
        }
    });
    app.get('/api/users', (0, supabase_auth_middleware_1.requireRole)('admin', 'owner'), async (req, res) => {
        try {
            const users = await storage_1.storage.getAllUsers();
            res.json({ users });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });
    app.get('/api/permissions', (0, supabase_auth_middleware_1.requireRole)('admin', 'owner'), async (req, res) => {
        try {
            const permissions = await storage_1.storage.getAllPermissions();
            res.json({ permissions });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch permissions' });
        }
    });
    app.delete('/api/clear-all-data', (0, supabase_auth_middleware_1.requireRole)('admin', 'owner'), async (req, res) => {
        res.json({ success: true });
        io.emit('dataCleared', { success: true });
    });
    app.get('/api/dashboard', async (req, res) => {
        try {
            const totals = await storage_1.storage.getDashboardTotals();
            const recentTransactions = await storage_1.storage.getRecentTransactions(5);
            const topSuppliers = await storage_1.storage.getTopSuppliers(5);
            res.json({ totals, recentTransactions, topSuppliers });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    });
    app.get('/api/statistics/week', async (req, res) => {
        try {
            const weeklyData = await storage_1.storage.getWeeklyStatistics();
            res.json({ data: weeklyData });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch weekly statistics' });
        }
    });
    app.get('/api/reports', async (req, res) => {
        try {
            const dateRange = req.query.dateRange;
            let reports;
            if (dateRange) {
                reports = await storage_1.storage.getReportsByDateRange(dateRange);
            }
            else {
                reports = await storage_1.storage.getAllReports();
            }
            res.json(reports);
            io.emit('reportUpdated', reports);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch reports' });
        }
    });
    app.get('/api/bills', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search;
            const dateRange = req.query.dateRange;
            let bills;
            if (search) {
                bills = await storage_1.storage.searchBills(search);
            }
            else if (dateRange) {
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
                bills = await storage_1.storage.getBillsByDateRange(startDate, endDate);
            }
            else {
                bills = await storage_1.storage.getBills(limit, offset);
            }
            res.json(bills);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch bills" });
        }
    });
    app.post('/api/bills', supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const bill = await storage_1.storage.createBill(req.body);
            res.json({ success: true, data: bill, message: 'Bill created successfully' });
            io.emit('billCreated', bill);
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Failed to create bill', details: error?.message || error });
            io.emit('error', { type: 'bill', message: 'Failed to create bill', details: error?.message || error });
        }
    });
    app.put('/api/bills/:id', supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const bill = await storage_1.storage.updateBill(id, req.body);
            if (!bill)
                return res.status(404).json({ success: false, error: 'Bill not found' });
            res.json({ success: true, data: bill, message: 'Bill updated successfully' });
            io.emit('billUpdated', bill);
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Failed to update bill', details: error?.message || error });
            io.emit('error', { type: 'bill', message: 'Failed to update bill', details: error?.message || error });
        }
    });
    app.delete('/api/bills/:id', supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const success = await storage_1.storage.deleteBill(id);
            if (!success)
                return res.status(404).json({ success: false, error: 'Bill not found' });
            res.json({ success: true, message: 'Bill deleted successfully' });
            io.emit('billDeleted', id);
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Failed to delete bill', details: error?.message || error });
            io.emit('error', { type: 'bill', message: 'Failed to delete bill', details: error?.message || error });
        }
    });
    app.get('/api/search', async (req, res) => {
        try {
            const q = req.query.q || '';
            const transactionResults = await storage_1.storage.searchTransactions(q);
            const supplierResults = await storage_1.storage.searchSuppliers(q);
            const inventoryResults = await storage_1.storage.searchInventory(q);
            res.json({ query: q, transactions: transactionResults, suppliers: supplierResults, inventory: inventoryResults });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to perform search' });
        }
    });
    app.get('/api/statistics/today', async (req, res) => {
        try {
            const stats = await storage_1.storage.getTodayStats();
            res.json({ statistics: { today: stats } });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch today\'s statistics' });
        }
    });
    app.post("/api/transactions", supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const validatedData = schema_1.insertTransactionSchema.parse(req.body);
            const transaction = await storage_1.storage.createTransaction(validatedData);
            res.json({ success: true, data: transaction, message: 'Transaction created successfully' });
            io.emit("transactionCreated", transaction);
        }
        catch (error) {
            console.error('Transaction creation error:', error);
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
            }
            else {
                res.status(500).json({ success: false, error: 'Failed to create transaction', details: error?.message || error });
            }
            io.emit('error', { type: 'transaction', message: 'Failed to create transaction', details: error?.message || error });
        }
    });
    app.get("/api/transactions", async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search;
            const dateRange = req.query.dateRange;
            let query = supabase.from('transactions').select('*');
            if (search) {
                query = query.or(`customer_name.ilike.%${search}%, mobile_number.ilike.%${search}%, device_model.ilike.%${search}%, repair_type.ilike.%${search}%`);
            }
            else if (dateRange) {
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
        }
        catch (error) {
            console.error('Transactions route error:', error);
            res.status(500).json({ message: "Failed to fetch transactions" });
        }
    });
    app.get("/api/transactions/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id))
                return res.status(400).json({ message: "Invalid transaction ID" });
            const transaction = await storage_1.storage.getTransaction(id);
            if (!transaction) {
                return res.status(404).json({ message: "Transaction not found" });
            }
            res.json(transaction);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch transaction" });
        }
    });
    app.put("/api/transactions/:id", supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id))
                return res.status(400).json({ message: "Invalid transaction ID" });
            const validatedData = schema_1.insertTransactionSchema.partial().parse(req.body);
            const transaction = await storage_1.storage.updateTransaction(id, validatedData);
            if (!transaction) {
                return res.status(404).json({ message: "Transaction not found" });
            }
            res.json({ success: true, data: transaction, message: 'Transaction updated successfully' });
            io.emit("transactionUpdated", transaction);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
            }
            else {
                res.status(500).json({ success: false, error: 'Failed to update transaction', details: error?.message || error });
            }
            io.emit('error', { type: 'transaction', message: 'Failed to update transaction', details: error?.message || error });
        }
    });
    app.delete("/api/transactions/:id", supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id))
                return res.status(400).json({ message: "Invalid transaction ID" });
            const success = await storage_1.storage.deleteTransaction(id);
            if (!success) {
                return res.status(404).json({ message: "Transaction not found" });
            }
            res.json({ success: true, message: "Transaction deleted successfully" });
            io.emit("transactionDeleted", id);
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Failed to delete transaction', details: error?.message || error });
            io.emit('error', { type: 'transaction', message: 'Failed to delete transaction', details: error?.message || error });
        }
    });
    app.get("/api/stats/today", async (req, res) => {
        try {
            const stats = await storage_1.storage.getTodayStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch today's stats" });
        }
    });
    app.get("/api/stats/week", async (req, res) => {
        try {
            const stats = await storage_1.storage.getWeekStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch week's stats" });
        }
    });
    app.get("/api/stats/month", async (req, res) => {
        try {
            const stats = await storage_1.storage.getMonthStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch month's stats" });
        }
    });
    app.get("/api/stats/year", async (req, res) => {
        try {
            const stats = await storage_1.storage.getYearStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch year's stats" });
        }
    });
    app.post("/api/inventory", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertInventoryItemSchema.parse(req.body);
                const item = await storage_1.storage.createInventoryItem(validatedData);
                res.json(item);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: "Validation error", errors: error.errors });
                }
                else {
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
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const search = req.query.search;
                let query = supabase.from('inventory').select('*');
                if (search) {
                    query = query.or(`name.ilike.%${search}%, category.ilike.%${search}%, brand.ilike.%${search}%`);
                }
                const { data: items, error } = await query
                    .range(offset, offset + limit - 1)
                    .order('created_at', { ascending: false });
                if (error) {
                    console.error('Inventory fetch error:', error);
                    return res.status(500).json({ message: "Failed to fetch inventory items" });
                }
                res.json(items || []);
            }
            catch (error) {
                console.error('Inventory route error:', error);
                res.status(500).json({ message: "Failed to fetch inventory items" });
            }
        })().catch(error => {
            console.error('Inventory route exception:', error);
            res.status(500).json({ message: "Failed to fetch inventory items" });
        });
    });
    app.post("/api/suppliers", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertSupplierSchema.parse(req.body);
                const supplier = await storage_1.storage.createSupplier(validatedData);
                res.json(supplier);
                io.emit("supplierCreated", supplier);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: "Validation error", errors: error.errors });
                }
                else {
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
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const search = req.query.search;
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
            }
            catch (error) {
                console.error('Suppliers route error:', error);
                res.status(500).json({ message: "Failed to fetch suppliers" });
            }
        })().catch(error => {
            console.error('Suppliers route exception:', error);
            res.status(500).json({ message: "Failed to fetch suppliers" });
        });
    });
    app.put("/api/suppliers/:id", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const id = parseInt(req.params.id);
                const validatedData = schema_1.insertSupplierSchema.partial().parse(req.body);
                const supplier = await storage_1.storage.updateSupplier(id, validatedData);
                if (!supplier)
                    return res.status(404).json({ message: "Supplier not found" });
                res.json(supplier);
                io.emit("supplierUpdated", supplier);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: "Validation error", errors: error.errors });
                }
                else {
                    res.status(500).json({ message: "Failed to update supplier" });
                }
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to update supplier" });
        });
    });
    app.delete("/api/suppliers/:id", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const id = parseInt(req.params.id);
                const success = await storage_1.storage.deleteSupplier(id);
                if (!success)
                    return res.status(404).json({ message: "Supplier not found" });
                res.json({ message: "Supplier deleted successfully" });
                io.emit("supplierDeleted", id);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to delete supplier" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to delete supplier" });
        });
    });
    app.post("/api/supplier-payments", (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertSupplierPaymentSchema.parse(req.body);
                const payment = await storage_1.storage.createSupplierPayment(validatedData);
                res.json({ success: true, data: payment, message: 'Payment created successfully' });
                io.emit("paymentCreated", payment);
                io.emit("supplierPaymentMade", payment);
                const summary = await storage_1.storage.getSupplierExpenditureSummary();
                io.emit("supplierSummaryChanged", summary);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
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
                const supplierId = req.query.supplierId ? parseInt(req.query.supplierId) : undefined;
                const payments = await storage_1.storage.getSupplierPayments(supplierId);
                res.json(payments);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch supplier payments" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to fetch supplier payments" });
        });
    });
    app.get("/api/purchase-orders", (req, res) => {
        (async () => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const orders = await storage_1.storage.getPurchaseOrders(limit, offset);
                res.json(orders);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch purchase orders" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to fetch purchase orders" });
        });
    });
    app.post("/api/expenditures", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertExpenditureSchema.parse(req.body);
                const expenditure = await storage_1.storage.createExpenditure(validatedData);
                res.json({ success: true, data: expenditure, message: 'Expenditure created successfully' });
                io.emit("expenditureCreated", expenditure);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
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
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const search = req.query.search;
                const dateRange = req.query.dateRange;
                let expenditures;
                if (search) {
                    expenditures = await storage_1.storage.getExpenditures(limit, offset);
                }
                else if (dateRange) {
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
                    expenditures = await storage_1.storage.getExpenditures(limit, offset);
                }
                else {
                    expenditures = await storage_1.storage.getExpenditures(limit, offset);
                }
                res.json(expenditures);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch expenditures" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to fetch expenditures" });
        });
    });
    app.put("/api/expenditures/:id", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const id = parseInt(req.params.id);
                const validatedData = schema_1.insertExpenditureSchema.partial().parse(req.body);
                const expenditure = await storage_1.storage.updateExpenditure(id, validatedData);
                if (!expenditure)
                    return res.status(404).json({ message: "Expenditure not found" });
                res.json({ success: true, data: expenditure, message: 'Expenditure updated successfully' });
                io.emit("expenditureUpdated", expenditure);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
                    res.status(500).json({ success: false, error: 'Failed to update expenditure', details: error?.message || error });
                }
                io.emit('error', { type: 'expenditure', message: 'Failed to update expenditure', details: error?.message || error });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to update expenditure', details: error?.message || error });
            io.emit('error', { type: 'expenditure', message: 'Failed to update expenditure', details: error?.message || error });
        });
    });
    app.delete("/api/expenditures/:id", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const id = parseInt(req.params.id);
                const success = await storage_1.storage.deleteExpenditure(id);
                if (!success) {
                    return res.status(404).json({ message: "Expenditure not found" });
                }
                res.json({ success: true, message: "Expenditure deleted successfully" });
                io.emit("expenditureDeleted", id);
                const summary = await storage_1.storage.getSupplierExpenditureSummary();
                io.emit("supplierSummaryChanged", summary);
            }
            catch (error) {
                res.status(500).json({ success: false, error: 'Failed to delete expenditure', details: error?.message || error });
                io.emit('error', { type: 'expenditure', message: 'Failed to delete expenditure', details: error?.message || error });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to delete expenditure', details: error?.message || error });
            io.emit('error', { type: 'expenditure', message: 'Failed to delete expenditure', details: error?.message || error });
        });
    });
    app.get("/api/expenditures/supplier-summary", (req, res) => {
        (async () => {
            try {
                const summary = await storage_1.storage.getSupplierExpenditureSummary();
                res.json(summary);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to get supplier summary" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to get supplier summary" });
        });
    });
    app.post("/api/expenditures/supplier-payment", (req, res) => {
        (async () => {
            try {
                const { supplier, amount, paymentMethod, description } = req.body;
                if (!supplier || !amount || !paymentMethod) {
                    return res.status(400).json({ success: false, error: 'Supplier, amount, and payment method are required' });
                }
                const result = await storage_1.storage.createSupplierPayment({ supplierId: parseInt(supplier), amount, paymentMethod, description });
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
                    io.emit("supplierPaymentMade", { supplierId: parseInt(supplier), amount, paymentMethod, description });
                    const summary = await storage_1.storage.getSupplierExpenditureSummary();
                    io.emit("supplierSummaryChanged", summary);
                }
                else {
                    res.status(500).json({ success: false, error: 'Failed to record payment', details: 'Failed to record payment' });
                    io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: 'Failed to record payment' });
                }
            }
            catch (error) {
                res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
                io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to record payment', details: error?.message || error });
            io.emit('error', { type: 'supplierPayment', message: 'Failed to record payment', details: error?.message || error });
        });
    });
    app.get("/api/reports/export", (req, res) => {
        (async () => {
            try {
                const reportType = req.query.type || "overview";
                const dateRange = req.query.dateRange || "month";
                const workbook = new exceljs_1.default.Workbook();
                const worksheet = workbook.addWorksheet(`${reportType}-${dateRange}`);
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
                const transactions = await storage_1.storage.getTransactions(1000, 0);
                const filteredTransactions = transactions.filter(t => {
                    const transactionDate = new Date(t.createdAt);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
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
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=report-${reportType}-${dateRange}.xlsx`);
                await workbook.xlsx.write(res);
                res.end();
            }
            catch (error) {
                res.status(500).json({ message: "Failed to generate report" });
            }
        })().catch(error => {
            res.status(500).json({ message: "Failed to generate report" });
        });
    });
    app.get("/api/export/excel", async (req, res) => {
        try {
            const transactions = await storage_1.storage.getTransactions(1000, 0);
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');
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
            transactions.forEach(transaction => {
                let externalCost = 0;
                if (transaction.partsCost) {
                    try {
                        const parts = JSON.parse(transaction.partsCost);
                        if (Array.isArray(parts)) {
                            externalCost = parts.reduce((sum, part) => sum + (parseFloat(part.cost) || 0), 0);
                        }
                    }
                    catch { }
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
        }
        catch (error) {
            res.status(500).json({ message: "Failed to export transactions" });
        }
    });
    app.post("/api/grouped-expenditures", (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertGroupedExpenditureSchema.parse(req.body);
                const groupedExpenditure = await storage_1.storage.createGroupedExpenditure(validatedData);
                res.json({ success: true, data: groupedExpenditure, message: 'Grouped expenditure created successfully' });
                io.emit('groupedExpenditureCreated', groupedExpenditure);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
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
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const search = req.query.search;
                const dateRange = req.query.dateRange;
                let groupedExpenditures;
                if (search) {
                    groupedExpenditures = await storage_1.storage.searchGroupedExpenditures(search);
                }
                else if (dateRange) {
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
                    groupedExpenditures = await storage_1.storage.getGroupedExpendituresByDateRange(startDate, endDate);
                }
                else {
                    groupedExpenditures = await storage_1.storage.getGroupedExpenditures(limit, offset);
                }
                res.json(groupedExpenditures);
            }
            catch (error) {
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
                const groupedExpenditure = await storage_1.storage.getGroupedExpenditure(id);
                if (!groupedExpenditure) {
                    return res.status(404).json({ message: "Grouped expenditure not found" });
                }
                res.json(groupedExpenditure);
            }
            catch (error) {
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
                const validatedData = schema_1.insertGroupedExpenditureSchema.partial().parse(req.body);
                const groupedExpenditure = await storage_1.storage.updateGroupedExpenditure(id, validatedData);
                if (!groupedExpenditure) {
                    return res.status(404).json({ message: "Grouped expenditure not found" });
                }
                res.json({ success: true, data: groupedExpenditure, message: 'Grouped expenditure updated successfully' });
                io.emit('groupedExpenditureUpdated', groupedExpenditure);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
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
                const success = await storage_1.storage.deleteGroupedExpenditure(id);
                if (!success) {
                    return res.status(404).json({ message: "Grouped expenditure not found" });
                }
                res.json({ success: true, message: "Grouped expenditure deleted successfully" });
                io.emit('groupedExpenditureDeleted', id);
            }
            catch (error) {
                res.status(500).json({ success: false, error: 'Failed to delete grouped expenditure', details: error?.message || error });
                io.emit('error', { type: 'groupedExpenditure', message: 'Failed to delete grouped expenditure', details: error?.message || error });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to delete grouped expenditure', details: error?.message || error });
            io.emit('error', { type: 'groupedExpenditure', message: 'Failed to delete grouped expenditure', details: error?.message || error });
        });
    });
    app.post("/api/grouped-expenditure-payments", supabase_auth_middleware_1.requireNotDemo, (req, res) => {
        (async () => {
            try {
                const validatedData = schema_1.insertGroupedExpenditurePaymentSchema.parse(req.body);
                const payment = await storage_1.storage.createGroupedExpenditurePayment(validatedData);
                res.json({ success: true, data: payment, message: 'Payment created successfully' });
                io.emit('groupedExpenditurePaymentCreated', payment);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
                }
                else {
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
                const payments = await storage_1.storage.getGroupedExpenditurePayments(groupedExpenditureId);
                res.json(payments);
            }
            catch (error) {
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
                const success = await storage_1.storage.deleteGroupedExpenditurePayment(id);
                if (!success) {
                    return res.status(404).json({ message: "Payment not found" });
                }
                res.json({ success: true, message: "Payment deleted successfully" });
                io.emit('groupedExpenditurePaymentDeleted', id);
            }
            catch (error) {
                res.status(500).json({ success: false, error: 'Failed to delete payment', details: error?.message || error });
                io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to delete payment', details: error?.message || error });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to delete payment', details: error?.message || error });
            io.emit('error', { type: 'groupedExpenditurePayment', message: 'Failed to delete payment', details: error?.message || error });
        });
    });
    app.get("/api/grouped-expenditures/summary", (req, res) => {
        (async () => {
            try {
                const summary = await storage_1.storage.getGroupedExpenditures(50, 0);
                res.json(summary);
            }
            catch (error) {
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
                const response = await axios_1.default.post(fast2smsUrl, payload, {
                    headers: {
                        'authorization': apiKey,
                        'Content-Type': 'application/json'
                    }
                });
                res.json({ success: true, data: response.data });
            }
            catch (error) {
                const errMsg = error.response?.data || error.message || 'Failed to send SMS';
                res.status(500).json({ success: false, error: errMsg });
            }
        })().catch(error => {
            res.status(500).json({ success: false, error: 'Failed to send SMS' });
        });
    });
    app.get('/api/repairs', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('repairs')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            res.json(data || []);
        }
        catch (error) {
            console.error('Repairs fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch repairs' });
        }
    });
    app.post('/api/repairs', supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const { customer_name, mobile_number, device_model, issue_description, repair_type, repair_cost } = req.body;
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
                device_type: device_model || 'Unknown Device',
                model: repair_type || 'General Repair',
                issue_description,
                estimated_cost: repair_cost,
                status: 'pending'
            })
                .select()
                .single();
            if (error)
                throw error;
            res.json(data);
            io.emit('repairCreated', data);
        }
        catch (error) {
            console.error('Repair creation error:', error);
            res.status(500).json({ error: 'Failed to create repair' });
        }
    });
    app.get('/api/customers', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            res.json(data || []);
        }
        catch (error) {
            console.error('Customers fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch customers' });
        }
    });
    app.post('/api/customers', supabase_auth_middleware_1.requireNotDemo, async (req, res) => {
        try {
            const { name, mobile_number, email, address } = req.body;
            const { data, error } = await supabase
                .from('customers')
                .insert({
                name,
                phone: mobile_number,
                email,
                address
            })
                .select()
                .single();
            if (error)
                throw error;
            res.json(data);
            io.emit('customerCreated', data);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create customer' });
        }
    });
    app.get('/api/analytics', async (req, res) => {
        try {
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
        }
        catch (error) {
            console.error('Analytics fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });
    app.post('/api/sms/send', (req, res) => {
        req.url = '/api/send-sms';
        app._router.handle(req, res);
    });
    app.post('/api/suppliers/payments', (req, res) => {
        req.url = '/api/grouped-expenditure-payments';
        app._router.handle(req, res);
    });
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
    app.get('/api/backup', (req, res) => {
        (async () => {
            try {
                const shop_id = req.query.shop_id;
                if (!shop_id)
                    return res.status(400).json({ error: 'shop_id required' });
                const data = await storage_1.storage.backupShopData(shop_id);
                res.json(data);
            }
            catch (e) {
                res.status(500).json({ error: 'Backup failed' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Backup failed' });
        });
    });
    app.post('/api/restore', (req, res) => {
        (async () => {
            try {
                const shop_id = req.body.shop_id;
                const data = req.body.data;
                if (!shop_id || !data)
                    return res.status(400).json({ error: 'shop_id and data required' });
                await storage_1.storage.restoreShopData(shop_id, data);
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: 'Restore failed' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Restore failed' });
        });
    });
    app.get('/api/transactions/range', (req, res) => {
        (async () => {
            try {
                const shop_id = req.query.shop_id;
                const start = req.query.start;
                const end = req.query.end;
                if (!shop_id || !start || !end)
                    return res.status(400).json({ error: 'shop_id, start, end required' });
                const tx = await storage_1.storage.getTransactionsByDateRangeForShop(shop_id, new Date(start), new Date(end));
                res.json(tx);
            }
            catch (e) {
                res.status(500).json({ error: 'Failed to fetch transactions' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        });
    });
    app.get('/api/bills/range', (req, res) => {
        (async () => {
            try {
                const shop_id = req.query.shop_id;
                const start = req.query.start;
                const end = req.query.end;
                if (!shop_id || !start || !end)
                    return res.status(400).json({ error: 'shop_id, start, end required' });
                const bills = await storage_1.storage.getBillsByDateRangeForShop(shop_id, new Date(start), new Date(end));
                res.json(bills);
            }
            catch (e) {
                res.status(500).json({ error: 'Failed to fetch bills' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Failed to fetch bills' });
        });
    });
    app.get('/api/expenditures/range', (req, res) => {
        (async () => {
            try {
                const shop_id = req.query.shop_id;
                const start = req.query.start;
                const end = req.query.end;
                if (!shop_id || !start || !end)
                    return res.status(400).json({ error: 'shop_id, start, end required' });
                const exps = await storage_1.storage.getExpendituresByDateRangeForShop(shop_id, new Date(start), new Date(end));
                res.json(exps);
            }
            catch (e) {
                res.status(500).json({ error: 'Failed to fetch expenditures' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Failed to fetch expenditures' });
        });
    });
    app.post('/api/feedback', (req, res) => {
        (async () => {
            try {
                const { billId, feedback } = req.body;
                if (!billId || !feedback)
                    return res.status(400).json({ error: 'billId and feedback required' });
                await storage_1.storage.saveFeedback(billId, feedback);
                res.json({ success: true });
            }
            catch (e) {
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
                const feedback = await storage_1.storage.getFeedback(billId);
                res.json({ feedback });
            }
            catch (e) {
                res.status(500).json({ error: 'Failed to fetch feedback' });
            }
        })().catch(error => {
            res.status(500).json({ error: 'Failed to fetch feedback' });
        });
    });
    app.get('/api/ping', (req, res) => {
        res.json({
            status: 'ok',
            message: 'pong',
            timestamp: new Date().toISOString(),
            port: process.env.PORT || 10000
        });
    });
}
//# sourceMappingURL=routes.js.map