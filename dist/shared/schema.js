"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackSchema = exports.smsSchema = exports.searchSchema = exports.insertReportSchema = exports.insertPermissionSchema = exports.insertActivityLogSchema = exports.insertSettingSchema = exports.insertNotificationSchema = exports.insertBillSchema = exports.insertUserSchema = exports.insertGroupedExpenditurePaymentSchema = exports.insertGroupedExpenditureSchema = exports.insertExpenditureSchema = exports.insertSupplierPaymentSchema = exports.insertPurchaseOrderSchema = exports.insertSupplierSchema = exports.insertInventoryItemSchema = exports.insertTransactionSchema = exports.groupedExpenditurePayments = exports.groupedExpenditures = exports.expenditures = exports.supplierPayments = exports.purchaseOrders = exports.suppliers = exports.inventoryItems = exports.transactions = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const zod_1 = require("zod");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    role: (0, pg_core_1.text)("role").notNull().default("worker"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
});
exports.transactions = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    customerName: (0, pg_core_1.text)("customer_name").notNull(),
    mobileNumber: (0, pg_core_1.text)("mobile_number").notNull(),
    deviceModel: (0, pg_core_1.text)("device_model").notNull(),
    repairType: (0, pg_core_1.text)("repair_type").notNull(),
    repairCost: (0, pg_core_1.decimal)("repair_cost", { precision: 10, scale: 2 }).notNull(),
    actualCost: (0, pg_core_1.decimal)("actual_cost", { precision: 10, scale: 2 }),
    profit: (0, pg_core_1.decimal)("profit", { precision: 10, scale: 2 }),
    amountGiven: (0, pg_core_1.decimal)("amount_given", { precision: 10, scale: 2 }).notNull(),
    changeReturned: (0, pg_core_1.decimal)("change_returned", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: (0, pg_core_1.text)("payment_method").notNull(),
    externalStoreName: (0, pg_core_1.text)("external_store_name"),
    externalItemName: (0, pg_core_1.text)("external_item_name"),
    externalItemCost: (0, pg_core_1.decimal)("external_item_cost", { precision: 10, scale: 2 }),
    internalCost: (0, pg_core_1.decimal)("internal_cost", { precision: 10, scale: 2 }),
    freeGlassInstallation: (0, pg_core_1.boolean)("free_glass_installation").notNull(),
    remarks: (0, pg_core_1.text)("remarks"),
    status: (0, pg_core_1.text)("status").notNull(),
    requiresInventory: (0, pg_core_1.boolean)("requires_inventory").notNull(),
    supplierName: (0, pg_core_1.text)("supplier_name"),
    partsCost: (0, pg_core_1.decimal)("parts_cost", { precision: 10, scale: 2 }),
    customSupplierName: (0, pg_core_1.text)("custom_supplier_name"),
    externalPurchases: (0, pg_core_1.text)("external_purchases"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.inventoryItems = (0, pg_core_1.pgTable)("inventory_items", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    partName: (0, pg_core_1.text)("part_name").notNull(),
    partType: (0, pg_core_1.text)("part_type").notNull(),
    compatibleDevices: (0, pg_core_1.text)("compatible_devices"),
    cost: (0, pg_core_1.decimal)("cost", { precision: 10, scale: 2 }).notNull(),
    sellingPrice: (0, pg_core_1.decimal)("selling_price", { precision: 10, scale: 2 }).notNull(),
    quantity: (0, pg_core_1.serial)("quantity").notNull(),
    supplier: (0, pg_core_1.text)("supplier").notNull(),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.suppliers = (0, pg_core_1.pgTable)("suppliers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    contactNumber: (0, pg_core_1.varchar)("contact_number", { length: 20 }),
    address: (0, pg_core_1.text)("address"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.purchaseOrders = (0, pg_core_1.pgTable)("purchase_orders", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    supplierId: (0, pg_core_1.serial)("supplier_id").references(() => exports.suppliers.id).notNull(),
    itemName: (0, pg_core_1.text)("item_name").notNull(),
    quantity: (0, pg_core_1.serial)("quantity").notNull(),
    unitCost: (0, pg_core_1.decimal)("unit_cost", { precision: 10, scale: 2 }).notNull(),
    totalCost: (0, pg_core_1.decimal)("total_cost", { precision: 10, scale: 2 }).notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    orderDate: (0, pg_core_1.timestamp)("order_date").defaultNow().notNull(),
    receivedDate: (0, pg_core_1.timestamp)("received_date"),
});
exports.supplierPayments = (0, pg_core_1.pgTable)("supplier_payments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    supplierId: (0, pg_core_1.serial)("supplier_id").references(() => exports.suppliers.id).notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: (0, pg_core_1.text)("payment_method").notNull(),
    description: (0, pg_core_1.text)("description"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    paymentDate: (0, pg_core_1.timestamp)("payment_date").defaultNow().notNull(),
});
exports.expenditures = (0, pg_core_1.pgTable)("expenditures", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    description: (0, pg_core_1.text)("description").notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    paymentMethod: (0, pg_core_1.text)("payment_method").notNull(),
    recipient: (0, pg_core_1.text)("recipient"),
    items: (0, pg_core_1.text)("items"),
    paidAmount: (0, pg_core_1.decimal)("paid_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    remainingAmount: (0, pg_core_1.decimal)("remaining_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.groupedExpenditures = (0, pg_core_1.pgTable)("grouped_expenditures", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    providerName: (0, pg_core_1.text)("provider_name").notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    totalAmount: (0, pg_core_1.decimal)("total_amount", { precision: 10, scale: 2 }).notNull(),
    periodStart: (0, pg_core_1.timestamp)("period_start").notNull(),
    periodEnd: (0, pg_core_1.timestamp)("period_end").notNull(),
    description: (0, pg_core_1.text)("description"),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.groupedExpenditurePayments = (0, pg_core_1.pgTable)("grouped_expenditure_payments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    groupedExpenditureId: (0, pg_core_1.serial)("grouped_expenditure_id").references(() => exports.groupedExpenditures.id).notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: (0, pg_core_1.text)("payment_method").notNull(),
    paymentDate: (0, pg_core_1.timestamp)("payment_date").defaultNow().notNull(),
    description: (0, pg_core_1.text)("description"),
    shop_id: (0, pg_core_1.text)("shop_id").default("default"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
const externalPurchaseSchema = zod_1.z.object({
    store: zod_1.z.string().min(1, "Supplier is required"),
    item: zod_1.z.string().min(1, "Item name is required"),
    cost: zod_1.z.number().min(0, "Cost must be 0 or greater"),
    customStore: zod_1.z.string().optional()
});
exports.insertTransactionSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, "Customer name is required"),
    mobileNumber: zod_1.z.string().min(1, "Mobile number is required"),
    deviceModel: zod_1.z.string().min(1, "Device model is required"),
    repairType: zod_1.z.string().min(1, "Repair type is required"),
    repairCost: zod_1.z.coerce.number().min(0, "Repair cost must be 0 or greater"),
    actualCost: zod_1.z.coerce.number().min(0).optional(),
    profit: zod_1.z.coerce.number().optional(),
    amountGiven: zod_1.z.coerce.number().min(0, "Amount given must be 0 or greater"),
    changeReturned: zod_1.z.coerce.number().min(0),
    paymentMethod: zod_1.z.string().min(1, "Payment method is required"),
    externalStoreName: zod_1.z.string().optional(),
    externalItemName: zod_1.z.string().optional(),
    externalItemCost: zod_1.z.coerce.number().optional(),
    externalPurchases: zod_1.z.array(externalPurchaseSchema).optional(),
    internalCost: zod_1.z.coerce.number().min(0).optional(),
    freeGlassInstallation: zod_1.z.boolean().optional(),
    remarks: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    requiresInventory: zod_1.z.boolean().optional(),
    supplierName: zod_1.z.string().optional(),
    partsCost: zod_1.z.union([
        zod_1.z.coerce.number().min(0),
        zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().optional(),
            cost: zod_1.z.number().min(0).optional(),
            quantity: zod_1.z.number().min(1).optional(),
            store: zod_1.z.string().optional(),
            item: zod_1.z.string().optional()
        }))
    ]).optional(),
    customSupplierName: zod_1.z.string().optional(),
    repairServiceType: zod_1.z.enum(["internal", "external"]).optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertInventoryItemSchema = zod_1.z.object({
    partName: zod_1.z.string().min(1, "Part name is required"),
    partType: zod_1.z.string().min(1, "Part type is required"),
    compatibleDevices: zod_1.z.string().optional(),
    cost: zod_1.z.coerce.number().min(0),
    sellingPrice: zod_1.z.coerce.number().min(0),
    quantity: zod_1.z.coerce.number().min(0),
    supplier: zod_1.z.string().min(1, "Supplier is required"),
    shop_id: zod_1.z.string().optional(),
});
exports.insertSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Supplier name is required"),
    contactNumber: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertPurchaseOrderSchema = zod_1.z.object({
    supplierId: zod_1.z.coerce.number().min(1),
    itemName: zod_1.z.string().min(1, "Item name is required"),
    quantity: zod_1.z.coerce.number().min(1),
    unitCost: zod_1.z.coerce.number().min(0),
    totalCost: zod_1.z.coerce.number().min(0),
    status: zod_1.z.string().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertSupplierPaymentSchema = zod_1.z.object({
    supplierId: zod_1.z.coerce.number().min(1),
    amount: zod_1.z.coerce.number().min(0),
    paymentMethod: zod_1.z.string().min(1, "Payment method is required"),
    description: zod_1.z.string().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertExpenditureSchema = zod_1.z.object({
    description: zod_1.z.string().min(1, "Description is required"),
    amount: zod_1.z.coerce.number().min(0),
    category: zod_1.z.string().min(1, "Category is required"),
    paymentMethod: zod_1.z.string().min(1, "Payment method is required"),
    recipient: zod_1.z.string().optional(),
    items: zod_1.z.string().optional(),
    paidAmount: zod_1.z.coerce.number().min(0).optional(),
    remainingAmount: zod_1.z.coerce.number().min(0).optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertGroupedExpenditureSchema = zod_1.z.object({
    providerName: zod_1.z.string().min(1, "Provider name is required"),
    category: zod_1.z.string().min(1, "Category is required"),
    totalAmount: zod_1.z.coerce.number().min(0),
    periodStart: zod_1.z.coerce.date(),
    periodEnd: zod_1.z.coerce.date(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertGroupedExpenditurePaymentSchema = zod_1.z.object({
    groupedExpenditureId: zod_1.z.coerce.number().min(1),
    amount: zod_1.z.coerce.number().min(0),
    paymentMethod: zod_1.z.string().min(1, "Payment method is required"),
    description: zod_1.z.string().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required"),
    password: zod_1.z.string().min(1, "Password is required"),
    role: zod_1.z.string().min(1).optional(),
    permanent: zod_1.z.boolean().optional(),
    shop_id: zod_1.z.string().optional(),
});
exports.insertBillSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, "Customer name is required"),
    customerPhone: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    customerAddress: zod_1.z.string().optional(),
    billNumber: zod_1.z.string().min(1, "Bill number is required"),
    totalAmount: zod_1.z.coerce.number().min(0, "Total amount must be 0 or greater"),
    taxAmount: zod_1.z.coerce.number().min(0).optional(),
    discountAmount: zod_1.z.coerce.number().min(0).optional(),
    finalAmount: zod_1.z.coerce.number().min(0, "Final amount must be 0 or greater"),
    paymentStatus: zod_1.z.string().optional(),
    paymentMethod: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    shopId: zod_1.z.string().optional(),
});
exports.insertNotificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    message: zod_1.z.string().min(1, "Message is required"),
    type: zod_1.z.string().optional(),
    userId: zod_1.z.coerce.number().optional(),
    priority: zod_1.z.string().optional(),
    actionUrl: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    shopId: zod_1.z.string().optional(),
});
exports.insertSettingSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().optional(),
    settingKey: zod_1.z.string().min(1, "Setting key is required"),
    settingValue: zod_1.z.any(),
    settingType: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    isPublic: zod_1.z.boolean().optional(),
    shopId: zod_1.z.string().optional(),
});
exports.insertActivityLogSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().optional(),
    action: zod_1.z.string().min(1, "Action is required"),
    entityType: zod_1.z.string().min(1, "Entity type is required"),
    entityId: zod_1.z.coerce.number().optional(),
    description: zod_1.z.string().min(1, "Description is required"),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    shopId: zod_1.z.string().optional(),
});
exports.insertPermissionSchema = zod_1.z.object({
    role: zod_1.z.string().min(1, "Role is required"),
    resource: zod_1.z.string().min(1, "Resource is required"),
    action: zod_1.z.string().min(1, "Action is required"),
    allowed: zod_1.z.boolean().optional(),
    conditions: zod_1.z.record(zod_1.z.any()).optional(),
    shopId: zod_1.z.string().optional(),
});
exports.insertReportSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Report name is required"),
    type: zod_1.z.string().min(1, "Report type is required"),
    description: zod_1.z.string().optional(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
    generatedBy: zod_1.z.coerce.number().optional(),
    shopId: zod_1.z.string().optional(),
});
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, "Search query is required"),
    type: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).optional(),
});
exports.smsSchema = zod_1.z.object({
    to: zod_1.z.string().min(1, "Phone number is required"),
    message: zod_1.z.string().min(1, "Message is required"),
    from: zod_1.z.string().optional(),
});
exports.feedbackSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, "Feedback message is required"),
    rating: zod_1.z.coerce.number().min(1).max(5).optional(),
    category: zod_1.z.string().optional(),
    userId: zod_1.z.coerce.number().optional(),
});
//# sourceMappingURL=schema.js.map