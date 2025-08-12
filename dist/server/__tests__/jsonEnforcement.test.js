"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const PORT = process.env.PORT || 10000;
const serverUrl = `http://localhost:${PORT}`;
describe('JSON Enforcement', () => {
    it('should always return JSON for /health with Accept: text/html', async () => {
        const res = await (0, supertest_1.default)(serverUrl)
            .get('/health')
            .set('Accept', 'text/html');
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(() => JSON.parse(res.text)).not.toThrow();
    });
    it('should always return JSON for /health with invalid Host', async () => {
        const res = await (0, supertest_1.default)(serverUrl)
            .get('/health')
            .set('Host', 'invalid.ngrok.io');
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(() => JSON.parse(res.text)).not.toThrow();
    });
});
//# sourceMappingURL=jsonEnforcement.test.js.map