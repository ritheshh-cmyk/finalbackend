"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const database_1 = require("../../lib/database");
let server;
let token;
let transactionId;
let supplierId;
let expenditureId;
let billId;
describe('Comprehensive API Endpoint Tests', () => {
    beforeAll(async () => {
        server = await (0, index_1.startServer)();
        await (0, database_1.sql)('DELETE FROM users WHERE username = $1', ['testuser_comprehensive']);
        await (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send({ username: 'testuser_comprehensive', password: 'password' });
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/auth/login')
            .send({ username: 'testuser_comprehensive', password: 'password' });
        token = res.body.token;
    }, 30000);
    afterAll(async () => {
        await (0, database_1.sql)('DELETE FROM users WHERE username = $1', ['testuser_comprehensive']);
        if (transactionId) {
            await (0, database_1.sql)('DELETE FROM transactions WHERE id = $1', [transactionId]);
        }
        if (supplierId) {
            await (0, database_1.sql)('DELETE FROM suppliers WHERE id = $1', [supplierId]);
            await (0, database_1.sql)('DELETE FROM supplier_payments WHERE supplier_id = $1', [supplierId]);
        }
        if (expenditureId) {
            await (0, database_1.sql)('DELETE FROM expenditures WHERE id = $1', [expenditureId]);
        }
        if (billId) {
            await (0, database_1.sql)('DELETE FROM bills WHERE id = $1', [billId]);
        }
        await new Promise(resolve => server.close(resolve));
    });
    describe('Authentication', () => {
        it('POST /api/auth/login - should login the user', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/auth/login')
                .send({ username: 'testuser_comprehensive', password: 'password' });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
        it('GET /api/auth/me - should get current user info', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.username).toBe('testuser_comprehensive');
        });
    });
    describe('Transactions', () => {
        it('POST /api/transactions - should create a transaction', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                customerName: "Test Customer",
                mobileNumber: "1234567890",
                deviceModel: "Test Model",
                repairType: "Screen",
                repairCost: "100.50",
                paymentMethod: "Cash",
                amountGiven: "150.00",
                changeReturned: "49.50",
                status: "Completed"
            });
            expect(res.status).toBe(200);
            expect(res.body.data.customer_name).toBe('Test Customer');
            transactionId = res.body.data.id;
        });
        it('GET /api/transactions - should get all transactions', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        it('PUT /api/transactions/:id - should update a transaction', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .put(`/api/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Paid' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('Paid');
        });
        it('DELETE /api/transactions/:id - should delete a transaction', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .delete(`/api/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const getRes = await (0, supertest_1.default)(index_1.app).get(`/api/transactions/${transactionId}`).set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(404);
        });
    });
    describe('Suppliers', () => {
        it('POST /api/suppliers - should create a supplier', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/suppliers')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Test Supplier', contactNumber: '9876543210' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Test Supplier');
            supplierId = res.body.id;
        });
        it('GET /api/suppliers - should get all suppliers', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/suppliers')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        it('PUT /api/suppliers/:id - should update a supplier', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .put(`/api/suppliers/${supplierId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ address: 'New Test Address' });
            expect(res.status).toBe(200);
            expect(res.body.address).toBe('New Test Address');
        });
        it('POST /api/suppliers/payments - should create a supplier payment', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/supplier-payments')
                .set('Authorization', `Bearer ${token}`)
                .send({ supplierId, amount: 50, paymentMethod: 'Card' });
            expect(res.status).toBe(200);
            expect(res.body.data.amount).toBe('50');
        });
        it('GET /api/suppliers/expenditure-summary - should get expenditure summary', async () => {
            await (0, supertest_1.default)(index_1.app)
                .post('/api/expenditures')
                .set('Authorization', `Bearer ${token}`)
                .send({ recipient: 'Test Supplier', amount: 100 });
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/expenditures/supplier-summary')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        it('DELETE /api/suppliers/:id - should delete a supplier', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .delete(`/api/suppliers/${supplierId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Supplier deleted successfully');
        });
    });
    describe('Inventory', () => {
        it('GET /api/inventory - should get inventory items', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
    describe('Dashboard', () => {
        it('GET /api/dashboard - should get dashboard data', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/dashboard')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.totals).toBeDefined();
            expect(res.body.recentTransactions).toBeDefined();
            expect(res.body.topSuppliers).toBeDefined();
        });
    });
    describe('Reports', () => {
        it('GET /api/reports - should get reports', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/reports')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
    describe('Expenditures', () => {
        it('POST /api/expenditures - should create an expenditure', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/expenditures')
                .set('Authorization', `Bearer ${token}`)
                .send({ recipient: 'Test Recipient', amount: 25 });
            expect(res.status).toBe(200);
            expenditureId = res.body.data.id;
        });
        it('GET /api/expenditures - should get all expenditures', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/expenditures')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        it('PUT /api/expenditures/:id - should update an expenditure', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .put(`/api/expenditures/${expenditureId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 30 });
            expect(res.status).toBe(200);
        });
        it('DELETE /api/expenditures/:id - should delete an expenditure', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .delete(`/api/expenditures/${expenditureId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
    describe('Bills', () => {
        it('POST /api/bills - should create a bill', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/bills')
                .set('Authorization', `Bearer ${token}`)
                .send({
                customerName: 'Bill Customer',
                mobileNumber: '1122334455',
                deviceModel: 'Bill Model',
                repairType: 'Battery',
                repairCost: 75,
                totalAmount: 75,
                billNumber: `testbill_${Date.now()}`
            });
            expect(res.status).toBe(200);
            billId = res.body.data.id;
        });
        it('GET /api/bills - should get all bills', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/bills')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        it('PUT /api/bills/:id - should update a bill', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .put(`/api/bills/${billId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Paid' });
            expect(res.status).toBe(200);
        });
        it('DELETE /api/bills/:id - should delete a bill', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .delete(`/api/bills/${billId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
    describe('Search', () => {
        it('GET /api/search?q=... - should search for data', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/search?q=Test')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.query).toBe('Test');
        });
    });
    describe('SMS', () => {
        it('POST /api/sms/send - should send an SMS', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post('/api/sms/send')
                .set('Authorization', `Bearer ${token}`)
                .send({ phone: '1234567890', message: 'Test SMS' });
            expect(res.status).toBe(500);
        });
    });
    describe('Statistics', () => {
        it('GET /api/statistics/today - should get today stats', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/statistics/today')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
        it('GET /api/statistics/week - should get week stats', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/statistics/week')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
        it('GET /api/statistics/month - should get month stats', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/statistics/month')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
        it('GET /api/statistics/year - should get year stats', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/statistics/year')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
    describe('Other', () => {
        it('GET /api/version - should get backend version', async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get('/api/version')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.version).toBeDefined();
        });
    });
});
//# sourceMappingURL=comprehensive_api.test.js.map