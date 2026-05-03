'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
  it('GET /health → 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404 Handler', () => {
  it('GET /nonexistent → 404', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
