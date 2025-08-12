"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const supertest_1 = __importDefault(require("supertest"));
const database_1 = require("../../lib/database");
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterAll(async () => {
    await (0, database_1.sql)('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
    await (0, database_1.sql)('DELETE FROM suppliers WHERE name LIKE $1', ['testsupplier%']);
    await (0, database_1.sql)('DELETE FROM expenditures WHERE recipient LIKE $1', ['testsupplier%']);
    await (0, database_1.sql)('DELETE FROM supplier_payments WHERE description LIKE $1', ['testpayment%']);
    await (0, database_1.sql)('DELETE FROM bills WHERE customer_name LIKE $1', ['testcustomer%']);
    index_1.io.close();
    index_1.server.close();
});
describe('API Tests', () => {
    let token;
    let supplierId;
    beforeAll(async () => {
        await (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send({ username: 'testuser', password: 'password' });
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/auth/login')
            .send({ username: 'testuser', password: 'password' });
        token = res.body.token;
    });
    it('should create a new supplier', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/suppliers')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'testsupplier', contactNumber: '1234567890' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('testsupplier');
        supplierId = res.body.id;
    });
    it('should create a new expenditure for the supplier', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/expenditures')
            .set('Authorization', `Bearer ${token}`)
            .send({ recipient: 'testsupplier', amount: 1000, description: 'test a new expenditure for the supplier' });
        expect(res.status).toBe(200);
        expect(res.body.data.recipient).toBe('testsupplier');
    });
    it('should create a new payment for the supplier', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/supplier-payments')
            .set('Authorization', `Bearer ${token}`)
            .send({ supplierId, amount: 500, paymentMethod: 'cash', description: 'testpayment' });
        expect(res.status).toBe(200);
        expect(res.body.data.amount).toBe('500');
    });
    it('should fetch the supplier expenditure summary', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .get('/api/expenditures/supplier-summary')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        const summary = res.body.find((s) => s.id === supplierId);
        expect(summary.due_amount).toBe('500');
    });
    it('should create a new bill', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/api/bills')
            .set('Authorization', `Bearer ${token}`)
            .send({
            customerName: 'testcustomer',
            mobileNumber: '1234567890',
            deviceModel: 'testdevice',
            repairType: 'testrepair',
            repairCost: 1000,
            totalAmount: 1000,
            billNumber: 'testbill',
        });
        expect(res.status).toBe(200);
        expect(res.body.data.customer_name).toBe('testcustomer');
    });
});
//# sourceMappingURL=api.test.js.map