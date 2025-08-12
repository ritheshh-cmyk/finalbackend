import { pgTable, text, serial, decimal, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

// User Management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("worker"), // ADDED: role field
  shop_id: text("shop_id").default("default"),
});

// Transaction Management
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  deviceModel: text("device_model").notNull(),
  repairType: text("repair_type").notNull(),
  repairCost: decimal("repair_cost", { precision: 10, scale: 2 }).notNull(),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  amountGiven: decimal("amount_given", { precision: 10, scale: 2 }).notNull(),
  changeReturned: decimal("change_returned", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  externalStoreName: text("external_store_name"),
  externalItemName: text("external_item_name"),
  externalItemCost: decimal("external_item_cost", { precision: 10, scale: 2 }),
  internalCost: decimal("internal_cost", { precision: 10, scale: 2 }),
  freeGlassInstallation: boolean("free_glass_installation").notNull(),
  remarks: text("remarks"),
  status: text("status").notNull(),
  requiresInventory: boolean("requires_inventory").notNull(),
  supplierName: text("supplier_name"),
  partsCost: decimal("parts_cost", { precision: 10, scale: 2 }),
  customSupplierName: text("custom_supplier_name"),
  externalPurchases: text("external_purchases"),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inventory/Parts Management
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  partName: text("part_name").notNull(),
  partType: text("part_type").notNull(),
  compatibleDevices: text("compatible_devices"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  quantity: serial("quantity").notNull(),
  supplier: text("supplier").notNull(),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Supplier/Store Management
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactNumber: varchar("contact_number", { length: 20 }),
  address: text("address"),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase Orders from Suppliers
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  supplierId: serial("supplier_id").references(() => suppliers.id).notNull(),
  itemName: text("item_name").notNull(),
  quantity: serial("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  shop_id: text("shop_id").default("default"),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  receivedDate: timestamp("received_date"),
});

// Payments to Suppliers
export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  supplierId: serial("supplier_id").references(() => suppliers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  description: text("description"),
  shop_id: text("shop_id").default("default"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

// Expenditure Tracking
export const expenditures = pgTable("expenditures", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull(),
  recipient: text("recipient"),
  items: text("items"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Grouped Expenditures
export const groupedExpenditures = pgTable("grouped_expenditures", {
  id: serial("id").primaryKey(),
  providerName: text("provider_name").notNull(),
  category: text("category").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment History for Grouped Expenditures
export const groupedExpenditurePayments = pgTable("grouped_expenditure_payments", {
  id: serial("id").primaryKey(),
  groupedExpenditureId: serial("grouped_expenditure_id").references(() => groupedExpenditures.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  description: text("description"),
  shop_id: text("shop_id").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
const externalPurchaseSchema = z.object({
  store: z.string().min(1, "Supplier is required"),
  item: z.string().min(1, "Item name is required"),
  cost: z.number().min(0, "Cost must be 0 or greater"),
  customStore: z.string().optional()
});

export const insertTransactionSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  deviceModel: z.string().min(1, "Device model is required"),
  repairType: z.string().min(1, "Repair type is required"),
  repairCost: z.coerce.number().min(0, "Repair cost must be 0 or greater"),
  actualCost: z.coerce.number().min(0).optional(),
  profit: z.coerce.number().optional(),
  amountGiven: z.coerce.number().min(0, "Amount given must be 0 or greater"),
  changeReturned: z.coerce.number().min(0),
  paymentMethod: z.string().min(1, "Payment method is required"),
  externalStoreName: z.string().optional(),
  externalItemName: z.string().optional(),
  externalItemCost: z.coerce.number().optional(),
  externalPurchases: z.array(externalPurchaseSchema).optional(),
  internalCost: z.coerce.number().min(0).optional(),
  freeGlassInstallation: z.boolean().optional(),
  remarks: z.string().optional(),
  status: z.string().optional(),
  requiresInventory: z.boolean().optional(),
  supplierName: z.string().optional(),
  partsCost: z.union([
    z.coerce.number().min(0),
    z.array(z.object({
      name: z.string().optional(),
      cost: z.number().min(0).optional(),
      quantity: z.number().min(1).optional(),
      store: z.string().optional(),
      item: z.string().optional()
    }))
  ]).optional(),
  customSupplierName: z.string().optional(),
  repairServiceType: z.enum(["internal", "external"]).optional(),
  shop_id: z.string().optional(),
});

export const insertInventoryItemSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  partType: z.string().min(1, "Part type is required"),
  compatibleDevices: z.string().optional(),
  cost: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0),
  supplier: z.string().min(1, "Supplier is required"),
  shop_id: z.string().optional(),
});

export const insertSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  shop_id: z.string().optional(),
});

export const insertPurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().min(1),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1),
  unitCost: z.coerce.number().min(0),
  totalCost: z.coerce.number().min(0),
  status: z.string().optional(),
  shop_id: z.string().optional(),
});

export const insertSupplierPaymentSchema = z.object({
  supplierId: z.coerce.number().min(1),
  amount: z.coerce.number().min(0),
  paymentMethod: z.string().min(1, "Payment method is required"),
  description: z.string().optional(),
  shop_id: z.string().optional(),
});

export const insertExpenditureSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  recipient: z.string().optional(),
  items: z.string().optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  remainingAmount: z.coerce.number().min(0).optional(),
  shop_id: z.string().optional(),
});

export const insertGroupedExpenditureSchema = z.object({
  providerName: z.string().min(1, "Provider name is required"),
  category: z.string().min(1, "Category is required"),
  totalAmount: z.coerce.number().min(0),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  description: z.string().optional(),
  status: z.string().optional(),
  shop_id: z.string().optional(),
});

export const insertGroupedExpenditurePaymentSchema = z.object({
  groupedExpenditureId: z.coerce.number().min(1),
  amount: z.coerce.number().min(0),
  paymentMethod: z.string().min(1, "Payment method is required"),
  description: z.string().optional(),
  shop_id: z.string().optional(),
});

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.string().min(1).optional(),
  permanent: z.boolean().optional(),
  shop_id: z.string().optional(),
});

// Bills validation schema
export const insertBillSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  billNumber: z.string().min(1, "Bill number is required"),
  totalAmount: z.coerce.number().min(0, "Total amount must be 0 or greater"),
  taxAmount: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  finalAmount: z.coerce.number().min(0, "Final amount must be 0 or greater"),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  shopId: z.string().optional(),
});

// Notifications validation schema
export const insertNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.string().optional(),
  userId: z.coerce.number().optional(),
  priority: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  shopId: z.string().optional(),
});

// Settings validation schema
export const insertSettingSchema = z.object({
  userId: z.coerce.number().optional(),
  settingKey: z.string().min(1, "Setting key is required"),
  settingValue: z.any(),
  settingType: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  shopId: z.string().optional(),
});

// Activity Log validation schema
export const insertActivityLogSchema = z.object({
  userId: z.coerce.number().optional(),
  action: z.string().min(1, "Action is required"),
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.coerce.number().optional(),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  shopId: z.string().optional(),
});

// Permissions validation schema
export const insertPermissionSchema = z.object({
  role: z.string().min(1, "Role is required"),
  resource: z.string().min(1, "Resource is required"),
  action: z.string().min(1, "Action is required"),
  allowed: z.boolean().optional(),
  conditions: z.record(z.any()).optional(),
  shopId: z.string().optional(),
});

// Reports validation schema
export const insertReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: z.string().min(1, "Report type is required"),
  description: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  generatedBy: z.coerce.number().optional(),
  shopId: z.string().optional(),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

// SMS validation schema
export const smsSchema = z.object({
  to: z.string().min(1, "Phone number is required"),
  message: z.string().min(1, "Message is required"),
  from: z.string().optional(),
});

// Feedback validation schema
export const feedbackSchema = z.object({
  message: z.string().min(1, "Feedback message is required"),
  rating: z.coerce.number().min(1).max(5).optional(),
  category: z.string().optional(),
  userId: z.coerce.number().optional(),
});

// Type exports
export type InsertTransaction = z.infer<typeof insertTransactionSchema> & { createdBy?: string };
export type Transaction = typeof transactions.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema> & { createdBy?: string };
export type Supplier = typeof suppliers.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertExpenditure = z.infer<typeof insertExpenditureSchema> & { createdBy?: string, remaining?: number };
export type Expenditure = typeof expenditures.$inferSelect;
export type InsertGroupedExpenditure = z.infer<typeof insertGroupedExpenditureSchema>;
export type GroupedExpenditure = typeof groupedExpenditures.$inferSelect;
export type InsertGroupedExpenditurePayment = z.infer<typeof insertGroupedExpenditurePaymentSchema>;
export type GroupedExpenditurePayment = typeof groupedExpenditurePayments.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New type exports for the additional schemas
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
export type SMSRequest = z.infer<typeof smsSchema>;
export type FeedbackRequest = z.infer<typeof feedbackSchema>;
