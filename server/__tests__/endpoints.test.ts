import request from 'supertest';
import { app } from '../index';

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
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(401);
    }
  });
});
