import request from 'supertest';

const PORT = process.env.PORT || 10000;
const serverUrl = `http://localhost:${PORT}`;

describe('JSON Enforcement', () => {
  it('should always return JSON for /health with Accept: text/html', async () => {
    const res = await request(serverUrl)
      .get('/health')
      .set('Accept', 'text/html');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(() => JSON.parse(res.text)).not.toThrow();
  });
  it('should always return JSON for /health with invalid Host', async () => {
    const res = await request(serverUrl)
      .get('/health')
      .set('Host', 'invalid.ngrok.io');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(() => JSON.parse(res.text)).not.toThrow();
  });
}); 