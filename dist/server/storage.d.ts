export namespace storage {
    function getUserByUsername(username: any): Promise<{
        id: number;
        username: any;
        password: string;
        role: string;
        shop_id: string;
    }>;
    function getUserById(id: any): Promise<{
        id: any;
        username: string;
        password: string;
        role: string;
        shop_id: string;
    }>;
    function createUser(data: any): Promise<any>;
    function getAllUsers(): Promise<{
        id: number;
        username: string;
        password: string;
        role: string;
        shop_id: string;
    }[]>;
    function updateUser(id: any, data: any): Promise<any>;
    function deleteUser(): Promise<boolean>;
    function getTransactions(limit?: number): Promise<{
        id: number;
        customerName: string;
        mobileNumber: string;
        deviceModel: string;
        repairType: string;
        repairCost: string;
        amountGiven: string;
        changeReturned: string;
        paymentMethod: string;
        status: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function createTransaction(data: any): Promise<any>;
    function searchTransactions(): Promise<{
        id: number;
        customerName: string;
        mobileNumber: string;
        deviceModel: string;
        repairType: string;
        repairCost: string;
        amountGiven: string;
        changeReturned: string;
        paymentMethod: string;
        status: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function updateTransaction(id: any, data: any): Promise<any>;
    function deleteTransaction(): Promise<boolean>;
    function getSuppliers(limit?: number): Promise<{
        id: number;
        name: string;
        contactNumber: string;
        address: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function createSupplier(data: any): Promise<any>;
    function searchSuppliers(): Promise<{
        id: number;
        name: string;
        contactNumber: string;
        address: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function updateSupplier(id: any, data: any): Promise<any>;
    function deleteSupplier(): Promise<boolean>;
    function getExpenditures(): Promise<{
        id: number;
        amount: string;
        description: string;
        category: string;
        paymentMethod: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function createExpenditure(data: any): Promise<any>;
    function updateExpenditure(id: any, data: any): Promise<any>;
    function deleteExpenditure(): Promise<boolean>;
    function getGroupedExpenditures(): Promise<{
        id: number;
        providerName: string;
        category: string;
        totalAmount: string;
        description: string;
        status: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function createGroupedExpenditure(data: any): Promise<any>;
    function updateGroupedExpenditure(id: any, data: any): Promise<any>;
    function deleteGroupedExpenditure(): Promise<boolean>;
    function getBills(): Promise<any[]>;
    function createBill(data: any): Promise<any>;
    function getTodayStats(): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        revenue: number;
        profit: number;
    }>;
    function getWeekStats(): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        revenue: number;
        profit: number;
    }>;
    function getMonthStats(): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        revenue: number;
        profit: number;
    }>;
    function getYearStats(): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        revenue: number;
        profit: number;
    }>;
    function getDashboardTotals(): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        totalSuppliers: number;
        totalExpenditures: number;
        totalProfit: number;
        totalCustomers: number;
        totalBills: number;
        totalInventory: number;
        totalPurchaseOrders: number;
    }>;
    function getDashboardStats(): Promise<{
        weekly: {
            totalRevenue: number;
            totalTransactions: number;
        };
        monthly: {
            totalRevenue: number;
            totalTransactions: number;
        };
        today: {
            totalRevenue: number;
            totalTransactions: number;
        };
    }>;
    function getReports(): Promise<{
        id: number;
        name: string;
        type: string;
        created_at: string;
    }[]>;
    function getRecentTransactions(limit?: number): Promise<{
        id: number;
        customerName: string;
        mobileNumber: string;
        deviceModel: string;
        repairType: string;
        repairCost: string;
        amountGiven: string;
        changeReturned: string;
        paymentMethod: string;
        status: string;
        shop_id: string;
        created_at: string;
    }[]>;
    function getUserSettings(): Promise<{
        theme: string;
        notifications: boolean;
    }>;
    function getSettings(): Promise<{
        theme: string;
        notifications: boolean;
    }[]>;
    function getPermissions(): Promise<{
        canCreate: boolean;
        canEdit: boolean;
        canView: boolean;
    }>;
    function getActivityLog(): Promise<any[]>;
    function getNotifications(): Promise<any[]>;
    function getPurchaseOrders(): Promise<any[]>;
    function getSupplierPayments(): Promise<any[]>;
    function getTransaction(): Promise<{
        id: number;
        customerName: string;
        mobileNumber: string;
        deviceModel: string;
        repairType: string;
        repairCost: string;
        amountGiven: string;
        changeReturned: string;
        paymentMethod: string;
        status: string;
        shop_id: string;
        created_at: string;
    }>;
    function getSupplier(): Promise<{
        id: number;
        name: string;
        contactNumber: string;
        address: string;
        shop_id: string;
        created_at: string;
    }>;
    function getExpenditure(): Promise<{
        id: number;
        amount: string;
        description: string;
        category: string;
        paymentMethod: string;
        shop_id: string;
        created_at: string;
    }>;
    function getGroupedExpenditure(): Promise<{
        id: number;
        providerName: string;
        category: string;
        totalAmount: string;
        description: string;
        status: string;
        shop_id: string;
        created_at: string;
    }>;
}
//# sourceMappingURL=storage.d.ts.map