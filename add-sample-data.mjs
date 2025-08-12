import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addSampleData() {
  console.log('Adding sample transactions and suppliers...');
  
  // Sample transactions
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
      parts_cost: 500,
      profit: 1500,
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
      parts_cost: 300,
      profit: 1200,
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
      parts_cost: 200,
      profit: 800,
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
      parts_cost: 800,
      profit: 2000,
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
      parts_cost: 400,
      profit: 1800,
      free_glass_installation: false,
      requires_inventory: false
    }
  ];

  // Sample suppliers
  const sampleSuppliers = [
    {
      name: 'TechParts India',
      contact_number: '9876543210',
      address: '123 Electronics Market, Delhi'
    },
    {
      name: 'Mobile Components Ltd',
      contact_number: '8765432109',
      address: '456 Tech Street, Mumbai'
    },
    {
      name: 'Screen Solutions',
      contact_number: '7654321098',
      address: '789 Display Plaza, Bangalore'
    }
  ];

  try {
    // Insert transactions
    console.log('Inserting sample transactions...');
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert(sampleTransactions)
      .select();
    
    if (transactionError) {
      console.error('Error inserting transactions:', transactionError);
    } else {
      console.log(`✅ Added ${transactionData.length} transactions`);
    }

    // Insert suppliers
    console.log('Inserting sample suppliers...');
    const { data: supplierData, error: supplierError } = await supabase
      .from('suppliers')
      .insert(sampleSuppliers)
      .select();
    
    if (supplierError) {
      console.error('Error inserting suppliers:', supplierError);
    } else {
      console.log(`✅ Added ${supplierData.length} suppliers`);
    }
    
    // Verify data
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    const { count: supplierCount } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n🎉 Sample data added successfully!');
    console.log(`📊 Total transactions in database: ${transactionCount}`);
    console.log(`📊 Total suppliers in database: ${supplierCount}`);
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    process.exit(0);
  }
}

addSampleData();