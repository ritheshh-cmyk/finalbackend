// 🔧 MIGRATION SCRIPT: Fix Existing Transaction Profits
// This script recalculates profit for all existing transactions

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://rlmebwbzqmoxqevmzddp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbWVid2J6cW1veHFldm16ZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxOTczNjEsImV4cCI6MjA0OTc3MzM2MX0.fQnEzf1r8PpAOqTmBsVULIyLBvGFbC1SU1VJOKhW_J8';

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ CORRECTED PROFIT CALCULATION FUNCTION
function calculateCorrectProfit(transaction) {
  const amountGiven = parseFloat(transaction.amount_given) || 0;
  const externalCost = parseFloat(transaction.external_item_cost) || 0;
  const internalCost = parseFloat(transaction.internal_cost) || 0;
  const laborCost = parseFloat(transaction.labor_cost) || 0;
  
  // Parse parts cost - handle different formats
  let partsCost = 0;
  if (transaction.parts_cost) {
    if (typeof transaction.parts_cost === 'string') {
      try {
        const parsed = JSON.parse(transaction.parts_cost);
        if (Array.isArray(parsed)) {
          partsCost = parsed.reduce((sum, part) => sum + (parseFloat(part.cost) || 0), 0);
        } else {
          partsCost = parseFloat(transaction.parts_cost) || 0;
        }
      } catch {
        partsCost = parseFloat(transaction.parts_cost) || 0;
      }
    } else if (typeof transaction.parts_cost === 'number') {
      partsCost = transaction.parts_cost;
    }
  }
  
  // ✅ CORRECT CALCULATION: profit = customer_payment - (service_costs + parts_costs)
  // Service cost depends on repair type (internal vs external)
  const serviceCost = transaction.repair_service_type === 'external' ? externalCost : internalCost;
  const actualCost = serviceCost + partsCost + laborCost;
  const profit = amountGiven - actualCost;
  
  return {
    actualCost,
    profit,
    details: {
      amountGiven,
      serviceCost,
      partsCost,
      laborCost,
      repairServiceType: transaction.repair_service_type
    }
  };
}

async function fixAllTransactionProfits() {
  console.log('🔄 Starting profit migration for all transactions...');
  
  try {
    // Get all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id');
      
    if (error) {
      console.error('❌ Error fetching transactions:', error);
      return;
    }
    
    console.log(`📊 Found ${transactions.length} transactions to process`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const transaction of transactions) {
      try {
        const { actualCost, profit } = calculateCorrectProfit(transaction);
        
        // Update the transaction with correct calculations
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ 
            actual_cost: actualCost,
            profit: profit
          })
          .eq('id', transaction.id);
          
        if (updateError) {
          console.error(`❌ Error updating transaction ${transaction.id}:`, updateError);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`✅ Updated ${updatedCount}/${transactions.length} transactions`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing transaction ${transaction.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log(`✅ Successfully updated: ${updatedCount} transactions`);
    console.log(`❌ Errors encountered: ${errorCount} transactions`);
    
    // Verify a few transactions
    console.log('\n📋 VERIFICATION - Sample transactions after fix:');
    const { data: sampleTransactions } = await supabase
      .from('transactions')
      .select('id, customer_name, amount_given, actual_cost, profit, repair_cost')
      .limit(5)
      .order('id', { ascending: false });
      
    sampleTransactions?.forEach(tx => {
      console.log(`Transaction ${tx.id}: ${tx.customer_name} - Payment: ₹${tx.amount_given}, Profit: ₹${tx.profit}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixAllTransactionProfits().then(() => {
  console.log('🏁 Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
