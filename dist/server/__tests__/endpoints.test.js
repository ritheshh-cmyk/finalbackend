"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
describe('Endpoint Tests', () => {
    it('should return 401 for all endpoints without a token', async () => {
        const endpoints = [
            '/api/transactions',
            '/api/suppliers',
            '/api/inventory',
            '/api/dashboard',
            '/api/reports',
            '/api/expenditures',
            '/api/bills',
            '/api/search?q=test',
            '/api/statistics/today',
            '/api/statistics/week',
            '/api/statistics/month',
            '/api/statistics/year',
            '/api/version',
        ];
        for (const endpoint of endpoints) {
            const res = await (0, supertest_1.default)(index_1.app).get(endpoint);
            expect(res.status).toBe(401);
        }
    });
});
//# sourceMappingURL=endpoints.test.js.map