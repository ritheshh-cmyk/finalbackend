import { sql } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';
import type { Transaction } from '../../../shared/types.js';

export default async function handler(req: any, res: any) {
  try {
    // Authenticate user
    const user = await requireAuth(req);

    switch (req.method) {
      case 'GET':
        return await getTransactions(req, res, user);
      case 'POST':
        return await createTransaction(req, res, user);
      case 'DELETE':
        return await clearTransactions(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.error('Transactions API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create transaction', 
      details: error.message || error 
    });
  }
}

async function getTransactions(req: any, res: any, user: any) {
  const transactions = await sql(
    `SELECT 
      id, 
      customer_name as "customerName", 
      mobile_number as "mobileNumber",
      device_model as "deviceModel", 
      repair_type as "repairType",
      repair_cost as "repairCost", 
      actual_cost as "actualCost",
      profit,
      payment_method as "paymentMethod",
      amount_given as "amountGiven", 
      change_returned as "changeReturned",
      external_store_name as "externalStoreName",
      external_item_name as "externalItemName", 
      external_item_cost as "externalItemCost",
      internal_cost as "internalCost",
      free_glass_installation as "freeGlassInstallation",
      status, 
      remarks, 
      requires_inventory as "requiresInventory",
      supplier_name as "supplierName",
      parts_cost as "partsCost",
      custom_supplier_name as "customSupplierName",
      external_purchases as "externalPurchases",
      shop_id as "shopId", 
      created_at as "createdAt",
      repair_service_type as "repairServiceType"
    FROM transactions 
    ORDER BY created_at DESC`
  );

  return res.status(200).json(transactions);
}

async function createTransaction(req: any, res: any, user: any) {
  console.log("📥 Received transaction data:", req.body);
  
  const {
    customerName,
    mobileNumber,
    deviceModel,
    repairType,
    repairCost,
    paymentMethod,
    amountGiven,
    changeReturned,
    status,
    remarks,
    partsCost
  } = req.body;

  // Enhanced validation with specific error messages
  const validationErrors = [];
  
  if (!customerName) validationErrors.push('customerName is required');
  if (!mobileNumber) validationErrors.push('mobileNumber is required');
  if (!deviceModel) validationErrors.push('deviceModel is required');
  if (!repairType) validationErrors.push('repairType is required');
  if (!repairCost) validationErrors.push('repairCost is required');
  
  // Enhanced amountGiven validation
  if (amountGiven === undefined || amountGiven === null) {
    validationErrors.push('amountGiven is required');
  } else {
    const numericAmountGiven = Number(amountGiven);
    if (isNaN(numericAmountGiven)) {
      validationErrors.push('amountGiven must be a valid number');
    } else if (numericAmountGiven < 0) {
      validationErrors.push('amountGiven must be 0 or greater');
    } else if (numericAmountGiven === 0) {
      validationErrors.push('amountGiven must be greater than 0');
    }
  }

  if (validationErrors.length > 0) {
    console.error("❌ Validation errors:", validationErrors);
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed',
      details: validationErrors,
      received_fields: Object.keys(req.body)
    });
  }

  // Ensure proper number conversion
  const numericAmountGiven = Number(amountGiven);
  console.log("💰 Amount calculations:", {
    amountGiven: amountGiven,
    parsedAmount: numericAmountGiven,
    repairCost: repairCost,
    type_amountGiven: typeof amountGiven,
    type_parsed: typeof numericAmountGiven
  });

  // Calculate profit for real-time business metrics using validated amountGiven
  const amount = numericAmountGiven;
  const cost = parseFloat(repairCost) || 0;
  const profit = amount - cost;

  console.log("🔢 Final calculations:", {
    amount: amount,
    cost: cost,  
    profit: profit,
    changeReturned: parseFloat(changeReturned) || 0
  });

  // Insert transaction with proper field mapping (database uses snake_case)
  const result = await sql(
    `INSERT INTO transactions (
      customer_name, mobile_number, device_model, repair_type, repair_cost,
      payment_method, amount_given, change_returned, status, remarks, parts_cost,
      free_glass_installation, requires_inventory, profit, actual_cost
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
     RETURNING id, customer_name as "customerName", device_model as "deviceModel", 
               amount_given as "amountGiven", repair_cost as "repairCost", 
               profit, status, created_at as "createdAt"`,
    [
      customerName, 
      mobileNumber, 
      deviceModel, 
      repairType, 
      cost,                        // Use calculated cost
      paymentMethod || 'cash',     // Fixed: lowercase 'cash'
      amount,                      // Use validated amount
      parseFloat(changeReturned) || 0,
      status || 'completed',       // Fixed: lowercase 'completed'
      remarks || '', 
      JSON.stringify(partsCost || []),
      false,                       // free_glass_installation
      false,                       // requires_inventory  
      profit,                      // calculated profit
      cost                         // actual_cost = repair_cost
    ]
  );

  const transactionId = result[0].id;
  const createdTransaction = result[0];

  console.log("✅ Transaction created successfully:", {
    id: transactionId,
    customerName: createdTransaction.customerName,
    amountGiven: createdTransaction.amountGiven,
    profit: createdTransaction.profit
  });

  // Create expenditures for parts (real-time expense tracking)
  if (partsCost && Array.isArray(partsCost) && partsCost.length > 0) {
    for (const part of partsCost) {
      await sql(
        `INSERT INTO expenditures (
          recipient, amount, description, payment_method, category
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          part.supplier || 'Parts Supplier',
          part.cost,
          `Parts for ${customerName} - ${deviceModel} (${part.item})`,
          'cash',
          'parts'
        ]
      );
    }
  }

  // Return real-time transaction data with proper field format
  return res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    transactionId,
    transaction: createdTransaction,  // Include full transaction data for immediate frontend update
    realTime: {
      created: true,
      timestamp: new Date().toISOString(),
      profit: createdTransaction.profit || profit,
      revenue: createdTransaction.amountGiven || amount
    }
  });
}

async function clearTransactions(req: any, res: any, user: any) {
  // Only allow admin users to clear all transactions
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  await sql('DELETE FROM transactions');
  await sql('DELETE FROM expenditures');
  await sql('DELETE FROM payments');

  return res.status(200).json({ message: 'All transactions cleared' });
}

// Utility endpoint to reset payments table based on expenditures
export async function resetPaymentsFromExpenditures() {
  const expenditures = await sql(
    `SELECT recipient, SUM(amount) as total_amount, SUM(remaining) as total_remaining
    FROM expenditures 
    GROUP BY recipient`
  );

  for (const exp of expenditures) {
    await sql(
      `INSERT INTO payments (name, total_due, total_remaining, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) 
      DO UPDATE SET 
        total_due = $5,
        total_remaining = $6`,
      [
        exp.recipient,
        exp.total_amount,
        exp.total_remaining,
        exp.total_remaining > 0 ? 'pending' : 'completed',
        exp.total_amount,
        exp.total_remaining
      ]
    );
  }
}
