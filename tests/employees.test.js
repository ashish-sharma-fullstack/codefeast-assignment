'use strict';

const request = require('supertest');
const app = require('../src/app');

// ─── POST /api/v1/employees ───────────────────────────────────────────────────
describe('POST /api/v1/employees', () => {
  // ── Happy path ──────────────────────────────────────────────────────────────
  describe('valid employee creation', () => {
    it('should return 201 with the created employee object', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        department: 'Engineering',
        salary: 75000,
      };

      const res = await request(app)
        .post('/api/v1/employees')
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      // Shape assertions — implementation must return these fields
      expect(res.body.data).toMatchObject({
        name: payload.name,
        email: payload.email,
        department: payload.department,
        salary: payload.salary,
      });

      // Auto-generated fields the DB should produce
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
    });
  });

  // ── Missing required fields ──────────────────────────────────────────────────
  describe('missing required fields', () => {
    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ email: 'no-name@example.com', department: 'HR', salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name/i);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'John Smith', department: 'Finance', salary: 60000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });

    it('should return 400 when salary is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice Green', email: 'alice@example.com', department: 'Design' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });

    it('should return 400 when the body is completely empty', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({})
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Negative salary ──────────────────────────────────────────────────────────
  describe('negative salary', () => {
    it('should return 400 when salary is a negative number', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({
          name: 'Bob Ray',
          email: 'bob@example.com',
          department: 'Ops',
          salary: -5000,
        })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });

    it('should return 400 when salary is zero', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({
          name: 'Carol White',
          email: 'carol@example.com',
          department: 'Marketing',
          salary: 0,
        })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });
  });
});
