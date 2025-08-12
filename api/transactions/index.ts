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
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTransactions(req: any, res: any, user: any) {
  const transactions = await sql`
    SELECT 
      id, customer_name as "customerName", mobile_number as "mobileNumber",
      device_model as "deviceModel", repair_type as "repairType",
      repair_cost as "repairCost", payment_method as "paymentMethod",
      amount_given as "amountGiven", change_returned as "changeReturned",
      status, remarks, parts_cost as "partsCost", created_at as "createdAt"
    FROM transactions 
    ORDER BY created_at DESC
  `;

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
  const result = await sql`
    INSERT INTO transactions (
      customer_name, mobile_number, device_model, repair_type, repair_cost,
      payment_method, amount_given, change_returned, status, remarks, parts_cost,
      free_glass_installation, requires_inventory
    ) VALUES (
      ${customerName}, ${mobileNumber}, ${deviceModel}, ${repairType}, ${repairCost},
      ${paymentMethod || 'Cash'}, ${amountGiven || repairCost}, ${changeReturned || 0},
      ${status || 'Completed'}, ${remarks || ''}, ${JSON.stringify(partsCost || [])},
      ${false}, ${false}
    ) RETURNING id
  `;

  const transactionId = result[0].id;

  // Create expenditures for parts
  if (partsCost && Array.isArray(partsCost)) {
    for (const part of partsCost) {
      if (part.cost > 0) {
        await sql`
          INSERT INTO expenditures (recipient, amount, description, remaining)
          VALUES (
            ${part.store || 'Unknown'}, 
            ${part.cost}, 
            ${`Parts for ${customerName} - ${deviceModel} (${part.item})`},
            ${part.cost}
          )
        `;
      }
    }
  }

  // Update supplier dues
  await updateSupplierDues();

  return res.status(201).json({ 
    message: 'Transaction created successfully',
    transactionId 
  });
}

async function clearTransactions(req: any, res: any, user: any) {
  // Only admin can clear transactions
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  await sql`DELETE FROM transactions`;
  await sql`DELETE FROM expenditures`;
  await sql`DELETE FROM payments`;

  return res.status(200).json({ message: 'All data cleared successfully' });
}

async function updateSupplierDues() {
  // Get all expenditures grouped by recipient
  const expenditures = await sql`
    SELECT recipient, SUM(amount) as total_amount, SUM(remaining) as total_remaining
    FROM expenditures 
    GROUP BY recipient
  `;

  // Update or insert supplier records
  for (const exp of expenditures) {
    await sql`
      INSERT INTO suppliers (name, total_due, total_remaining)
      VALUES (${exp.recipient}, ${exp.total_amount}, ${exp.total_remaining})
      ON CONFLICT (name) 
      DO UPDATE SET 
        total_due = ${exp.total_amount},
        total_remaining = ${exp.total_remaining}
    `;
  }
}