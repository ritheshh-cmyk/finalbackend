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
      id, customer_name as "customerName", mobile_number as "mobileNumber",
      device_model as "deviceModel", repair_type as "repairType",
      repair_cost as "repairCost", payment_method as "paymentMethod",
      amount_given as "amountGiven", change_returned as "changeReturned",
      status, remarks, parts_cost as "partsCost", created_at as "createdAt"
    FROM transactions 
    ORDER BY created_at DESC`
  );

  return res.status(200).json(transactions);
}

async function createTransaction(req: any, res: any, user: any) {
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

  // Validate required fields
  if (!customerName || !mobileNumber || !deviceModel || !repairType || !repairCost) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Insert transaction
  const result = await sql(
    `INSERT INTO transactions (
      customer_name, mobile_number, device_model, repair_type, repair_cost,
      payment_method, amount_given, change_returned, status, remarks, parts_cost,
      free_glass_installation, requires_inventory
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [
      customerName, 
      mobileNumber, 
      deviceModel, 
      repairType, 
      repairCost,
      paymentMethod || 'Cash', 
      amountGiven || repairCost, 
      changeReturned || 0,
      status || 'Completed', 
      remarks || '', 
      JSON.stringify(partsCost || []),
      false, 
      false
    ]
  );

  const transactionId = result[0].id;

  // Create expenditures for parts
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

  return res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    transactionId
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
