'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── POST /api/v1/employees ───────────────────────────────────────────────────
describe('POST /api/v1/employees', () => {
  // Wipe table before each test — keeps the unique email constraint from
  // firing across repeated runs and isolates each case.
  beforeEach(async () => {
    await prisma.employee.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('valid employee creation', () => {
    it('should return 201 with the created employee object', async () => {
      const payload = {
        name:     'Jane Doe',
        email:    'jane.doe@example.com',
        jobTitle: 'Software Engineer',
        country:  'IN',
        salary:   75000,
      };

      const res = await request(app)
        .post('/api/v1/employees')
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      // Shape assertions — implementation must return these fields
      expect(res.body.data).toMatchObject({
        name:     payload.name,
        email:    payload.email,
        jobTitle: payload.jobTitle,
        country:  payload.country,
        salary:   payload.salary,
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
        .send({ email: 'no-name@example.com', jobTitle: 'Developer', country: 'IN', salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name/i);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'John Smith', jobTitle: 'Analyst', country: 'US', salary: 60000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });

    it('should return 400 when jobTitle is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice Green', email: 'alice@example.com', country: 'IN', salary: 60000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/jobTitle/i);
    });

    it('should return 400 when country is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice Green', email: 'alice@example.com', jobTitle: 'Designer', salary: 60000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/country/i);
    });

    it('should return 400 when salary is missing', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice Green', email: 'alice@example.com', jobTitle: 'Designer', country: 'IN' })
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
          name:     'Bob Ray',
          email:    'bob@example.com',
          jobTitle: 'Ops Engineer',
          country:  'US',
          salary:   -5000,
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
          name:     'Carol White',
          email:    'carol@example.com',
          jobTitle: 'Marketing Manager',
          country:  'US',
          salary:   0,
        })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });
  });
});
