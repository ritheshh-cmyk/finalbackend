import { sql } from './lib/database.js';

async function addSampleTransactions() {
  console.log('Adding sample transactions...');
  
  const sampleTransactions = [
    {
      customer_name: 'John Doe',
      mobile_number: '9876543210',
      device_model: 'iPhone 14',
      repair_type: 'Screen Replacement',
      repair_cost: 2500,
      payment_method: 'cash',
      amount_given: 2500,
      change_returned: 0,
      status: 'completed',
      remarks: 'Screen replaced successfully',
      parts_cost: '[]',
      free_glass_installation: false,
      requires_inventory: false
    },
    {
      customer_name: 'Jane Smith',
      mobile_number: '8765432109',
      device_model: 'Samsung Galaxy S23',
      repair_type: 'Battery Replacement',
      repair_cost: 1800,
      payment_method: 'upi',
      amount_given: 1800,
      change_returned: 0,
      status: 'pending',
      remarks: 'Waiting for battery part',
      parts_cost: '[]',
      free_glass_installation: false,
      requires_inventory: true
    },
    {
      customer_name: 'Mike Johnson',
      mobile_number: '7654321098',
      device_model: 'OnePlus 11',
      repair_type: 'Charging Port Repair',
      repair_cost: 1200,
      payment_method: 'card',
      amount_given: 1200,
      change_returned: 0,
      status: 'in-progress',
      remarks: 'Repair in progress',
      parts_cost: '[]',
      free_glass_installation: true,
      requires_inventory: false
    },
    {
      customer_name: 'Sarah Wilson',
      mobile_number: '6543210987',
      device_model: 'iPhone 13 Pro',
      repair_type: 'Camera Repair',
      repair_cost: 3200,
      payment_method: 'bank-transfer',
      amount_given: 3200,
      change_returned: 0,
      status: 'delivered',
      remarks: 'Camera module replaced and tested',
      parts_cost: '[]',
      free_glass_installation: false,
      requires_inventory: false
    },
    {
      customer_name: 'David Brown',
      mobile_number: '5432109876',
      device_model: 'Xiaomi 13',
      repair_type: 'Water Damage Repair',
      repair_cost: 2800,
      payment_method: 'cash',
      amount_given: 3000,
      change_returned: 200,
      status: 'completed',
      remarks: 'Water damage repaired, all functions working',
      parts_cost: '[]',
      free_glass_installation: false,
      requires_inventory: false
    }
  ];

  try {
    for (const transaction of sampleTransactions) {
      await sql`
        INSERT INTO transactions (
          customer_name, mobile_number, device_model, repair_type, repair_cost,
          payment_method, amount_given, change_returned, status, remarks, parts_cost,
          free_glass_installation, requires_inventory
        ) VALUES (
          ${transaction.customer_name}, ${transaction.mobile_number}, ${transaction.device_model}, 
          ${transaction.repair_type}, ${transaction.repair_cost}, ${transaction.payment_method},
          ${transaction.amount_given}, ${transaction.change_returned}, ${transaction.status},
          ${transaction.remarks}, ${transaction.parts_cost}, ${transaction.free_glass_installation},
          ${transaction.requires_inventory}
        )
      `;
      console.log(`✅ Added transaction for ${transaction.customer_name}`);
    }
    
    console.log('\n🎉 All sample transactions added successfully!');
    
    // Verify by counting transactions
    const count = await sql`SELECT COUNT(*) as count FROM transactions`;
    console.log(`📊 Total transactions in database: ${count[0].count}`);
    
  } catch (error) {
    console.error('❌ Error adding sample transactions:', error);
  } finally {
    process.exit(0);
  }
}

addSampleTransactions();