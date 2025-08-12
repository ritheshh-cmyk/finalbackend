"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const socket_io_client_1 = require("socket.io-client");
const index_1 = __importDefault(require("../index"));
describe('Transactions API', () => {
    let server, clientSocket, token;
    beforeAll((done) => {
        server = index_1.default.listen(4001, () => {
            (0, supertest_1.default)(server)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'lucky@777' })
                .end((err, res) => {
                token = res.body.token;
                clientSocket = (0, socket_io_client_1.io)('http://localhost:4001', {
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
    it('should create a transaction and emit event', (done) => {
        jest.setTimeout(15000);
        clientSocket.on('transactionCreated', (payload) => {
            expect(payload.data.customerName).toBe('Test User');
            done();
        });
        (0, supertest_1.default)(server)
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
//# sourceMappingURL=transactions.test.js.map