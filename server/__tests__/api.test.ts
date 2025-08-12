import { app, server, io } from '../index';
import request from 'supertest';
import { sql } from '../../lib/database';

// Silence console logs
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  // Clean up test data
  await sql('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
  await sql('DELETE FROM suppliers WHERE name LIKE $1', ['testsupplier%']);
  await sql('DELETE FROM expenditures WHERE recipient LIKE $1', ['testsupplier%']);
  await sql('DELETE FROM supplier_payments WHERE description LIKE $1', ['testpayment%']);
  await sql('DELETE FROM bills WHERE customer_name LIKE $1', ['testcustomer%']);

  // Close server and db connection
  io.close();
  server.close();
});

describe('API Tests', () => {
  let token: string;
  let supplierId: number;

  beforeAll(async () => {
    // Create a test user and get a token
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password' });
    token = res.body.token;
  });

  it('should create a new supplier', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'testsupplier', contactNumber: '1234567890' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('testsupplier');
    supplierId = res.body.id;
  });

  it('should create a new expenditure for the supplier', async () => {
    const res = await request(app)
      .post('/api/expenditures')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient: 'testsupplier', amount: 1000, description: 'test a new expenditure for the supplier' });
    expect(res.status).toBe(200);
    expect(res.body.data.recipient).toBe('testsupplier');
  });

  it('should create a new payment for the supplier', async () => {
    const res = await request(app)
      .post('/api/supplier-payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierId, amount: 500, paymentMethod: 'cash', description: 'testpayment' });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe('500');
  });

  it('should fetch the supplier expenditure summary', async () => {
    const res = await request(app)
      .get('/api/expenditures/supplier-summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const summary = res.body.find((s: any) => s.id === supplierId);
    expect(summary.due_amount).toBe('500');
  });

  it('should create a new bill', async () => {
    const res = await request(app)
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
