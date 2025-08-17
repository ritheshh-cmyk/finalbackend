import { sql } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req: any, res: any) {
  try {
    // Authenticate user
    const user = await requireAuth(req);

    switch (req.method) {
      case 'GET':
        return await getAvailabilityReport(req, res, user);
      case 'POST':
        return await checkSpecificTransaction(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.error('Availability API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAvailabilityReport(req: any, res: any, user: any) {
  try {
    // Get all transactions with proper field transformation
    const transactions = await sql(
      `SELECT 
        id, 
        customer_name as "customerName", 
        device_model as "deviceModel", 
        repair_type as "repairType", 
        status, 
        created_at as "createdAt", 
        amount_given as "amountGiven"
       FROM transactions 
       ORDER BY id ASC`
    );

    if (transactions.length === 0) {
      return res.json({
        summary: {
          totalRecords: 0,
          idRange: "0-0",
          missingIds: [],
          deletedCount: 0,
          availabilityRate: "100.0"
        },
        devices: [],
        missingTransactions: [],
        recentTransactions: []
      });
    }

    // Calculate availability statistics
    const existingIds = transactions.map(tx => tx.id);
    const minId = Math.min(...existingIds);
    const maxId = Math.max(...existingIds);

    // Find missing IDs
    const missingIds: number[] = [];
    for (let id = minId; id <= maxId; id++) {
      if (!existingIds.includes(id)) {
        missingIds.push(id);
      }
    }

    // Device statistics
    const deviceStats: { [key: string]: { total: number; statuses: { [key: string]: number }; totalRevenue: number } } = {};
    transactions.forEach(tx => {
      const deviceModel = tx.deviceModel;  // Now using camelCase
      if (!deviceStats[deviceModel]) {
        deviceStats[deviceModel] = {
          total: 0,
          statuses: {},
          totalRevenue: 0
        };
      }
      deviceStats[deviceModel].total++;
      deviceStats[deviceModel].statuses[tx.status] = 
        (deviceStats[deviceModel].statuses[tx.status] || 0) + 1;
      deviceStats[deviceModel].totalRevenue += parseFloat(tx.amountGiven) || 0;  // Now using camelCase
    });

    // Create availability report
    const availabilityReport = {
      summary: {
        totalRecords: transactions.length,
        idRange: `${minId}-${maxId}`,
        missingIds: missingIds,
        deletedCount: missingIds.length,
        availabilityRate: ((transactions.length / (maxId - minId + 1)) * 100).toFixed(1)
      },
      devices: Object.entries(deviceStats)
        .sort(([,a], [,b]) => (b as any).total - (a as any).total)
        .map(([device, stats]) => ({
          deviceModel: device,
          totalTransactions: (stats as any).total,
          totalRevenue: (stats as any).totalRevenue,
          statuses: (stats as any).statuses,
          availability: 'Available'
        })),
      missingTransactions: missingIds.map(id => ({
        id: id,
        status: 'Deleted',
        customerName: '[Record Not Available]',
        deviceModel: '[Unknown]',
        availability: 'Not Available'
      })),
      recentTransactions: transactions
        .slice(-10)
        .reverse()
        .map(tx => ({
          id: tx.id,
          customerName: tx.customerName,  // Now using camelCase from SQL alias
          deviceModel: tx.deviceModel,    // Now using camelCase from SQL alias
          repairType: tx.repairType,      // Now using camelCase from SQL alias
          status: tx.status,
          amount: tx.amountGiven,         // Now using camelCase from SQL alias
          createdAt: tx.createdAt,        // Now using camelCase from SQL alias
          availability: 'Available'
        }))
    };

    return res.json(availabilityReport);

  } catch (error: any) {
    console.error('Error generating availability report:', error);
    return res.status(500).json({ error: 'Failed to generate availability report' });
  }
}

async function checkSpecificTransaction(req: any, res: any, user: any) {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const transactions = await sql(
      `SELECT 
        id,
        customer_name as "customerName",
        device_model as "deviceModel", 
        repair_type as "repairType",
        status,
        amount_given as "amountGiven",
        created_at as "createdAt"
       FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.json({
        id: transactionId,
        available: false,
        status: 'Not Found',
        message: `Transaction ID ${transactionId} does not exist or was deleted`
      });
    }

    const transaction = transactions[0];
    
    return res.json({
      id: transactionId,
      available: true,
      status: 'Available',
      data: {
        customerName: transaction.customerName,    // Now using camelCase from SQL alias
        deviceModel: transaction.deviceModel,      // Now using camelCase from SQL alias
        repairType: transaction.repairType,        // Now using camelCase from SQL alias
        status: transaction.status,
        amount: transaction.amountGiven,           // Now using camelCase from SQL alias
        createdAt: transaction.createdAt           // Now using camelCase from SQL alias
      }
    });

  } catch (error: any) {
    console.error('Error checking specific transaction:', error);
    return res.json({
      id: req.body.transactionId,
      available: false,
      status: 'Error',
      message: error.message
    });
  }
}
