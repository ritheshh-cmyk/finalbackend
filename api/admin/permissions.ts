// Admin Permissions API Endpoint
// /api/admin/permissions

import { sql } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req: any, res: any) {
  try {
    // Authenticate and check admin role
    const user = await requireAuth(req);
    
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    switch (req.method) {
      case 'GET':
        return await getPermissions(req, res);
      case 'POST':
        return await updatePermissions(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.error('Admin Permissions API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process permissions request', 
      details: error.message 
    });
  }
}

async function getPermissions(req: any, res: any) {
  try {
    // Try to get permissions from database
    const permissions = await sql(`
      SELECT 
        id,
        name,
        description,
        category,
        owner_access as "ownerAccess",
        worker_access as "workerAccess"
      FROM permissions 
      ORDER BY category, name
    `);

    // If no permissions in database, return defaults
    if (permissions.length === 0) {
      const defaultPermissions = [
        {
          id: 'dashboard',
          name: 'Dashboard',
          description: 'Main business overview and analytics',
          category: 'Core',
          ownerAccess: true,
          workerAccess: true
        },
        {
          id: 'repairs',
          name: 'Repairs',
          description: 'Device repair management',
          category: 'Core',
          ownerAccess: true,
          workerAccess: true
        },
        {
          id: 'customers',
          name: 'Customers',
          description: 'Customer management and history',
          category: 'Core',
          ownerAccess: true,
          workerAccess: true
        },
        {
          id: 'inventory',
          name: 'Inventory',
          description: 'Parts and stock management',
          category: 'Operations',
          ownerAccess: true,
          workerAccess: false
        },
        {
          id: 'suppliers',
          name: 'Suppliers',
          description: 'Supplier management and payments',
          category: 'Operations',
          ownerAccess: true,
          workerAccess: false
        },
        {
          id: 'transactions',
          name: 'Transactions',
          description: 'Transaction history and management',
          category: 'Finance',
          ownerAccess: true,
          workerAccess: true
        },
        {
          id: 'reports',
          name: 'Reports',
          description: 'Business reports and analytics',
          category: 'Analytics',
          ownerAccess: true,
          workerAccess: false
        },
        {
          id: 'services',
          name: 'Services',
          description: 'Service types and pricing',
          category: 'Operations',
          ownerAccess: true,
          workerAccess: false
        },
        {
          id: 'calculations',
          name: 'Calculations',
          description: 'Profit/loss calculations',
          category: 'Finance',
          ownerAccess: true,
          workerAccess: false
        }
      ];

      return res.status(200).json({
        success: true,
        data: defaultPermissions
      });
    }

    return res.status(200).json({
      success: true,
      data: permissions
    });
    
  } catch (error) {
    console.error('Get permissions error:', error);
    // Return default permissions if database query fails
    const defaultPermissions = [
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Main business overview',
        category: 'Core',
        ownerAccess: true,
        workerAccess: true
      },
      {
        id: 'repairs',
        name: 'Repairs',
        description: 'Device repair management',
        category: 'Core',
        ownerAccess: true,
        workerAccess: true
      }
    ];

    return res.status(200).json({
      success: true,
      data: defaultPermissions
    });
  }
}

async function updatePermissions(req: any, res: any) {
  const { permissions } = req.body;

  if (!permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Permissions array is required' 
    });
  }

  try {
    // Create permissions table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255) NOT NULL,
        owner_access BOOLEAN DEFAULT true,
        worker_access BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Clear existing permissions
    await sql(`DELETE FROM permissions`);

    // Insert new permissions
    for (const permission of permissions) {
      await sql(`
        INSERT INTO permissions (
          id, name, description, category, owner_access, worker_access
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        permission.id,
        permission.name,
        permission.description,
        permission.category,
        permission.ownerAccess,
        permission.workerAccess
      ]);
    }

    return res.status(200).json({
      success: true,
      message: 'Permissions updated successfully'
    });

  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update permissions',
      details: error.message
    });
  }
}
