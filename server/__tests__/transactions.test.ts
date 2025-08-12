import request from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../index'; // Adjust if your Express app is exported elsewhere

describe('Transactions API', () => {
  let server: any, clientSocket: any, token: any;

  beforeAll((done: any) => {
    server = app.listen(4001, () => {
      request(server)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'lucky@777' })
        .end((err: any, res: any) => {
          token = res.body.token;
          clientSocket = Client('http://localhost:4001', {
            auth: { token: `Bearer ${token}` }
          });
          clientSocket.on('connect', () => {
            done();
          });
        });
    });
  });

  afterAll(() => {
    clientSocket.close();
    server.close();
  });

  it('should create a transaction and emit event', (done: any) => {
    jest.setTimeout(15000);
    clientSocket.on('transactionCreated', (payload: any) => {
      expect(payload.data.customerName).toBe('Test User');
      done();
    });
    request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Test User',
        mobileNumber: '1234567890',
        repairType: 'Screen',
        deviceModel: 'iPhone',
        repairCost: 1000,
        partsCost: "[]",
        totalAmount: 1000,
        billNumber: "BILL-TEST-001",
        status: "generated",
        amountGiven: 1000,
        changeReturned: 0,
        paymentMethod: "cash"
      })
      .expect(200);
  });
}); 