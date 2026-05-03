'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helper ──────────────────────────────────────────────────────────────

const seed = (overrides = {}) =>
  prisma.employee.create({
    data: {
      name:       'Original Name',
      email:      'original@example.com',
      department: 'Engineering',
      salary:     60000,
      ...overrides,
    },
  });

// ─── Shared lifecycle ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── PUT /api/v1/employees/:id ────────────────────────────────────────────────
describe('PUT /api/v1/employees/:id', () => {

  // ── Successful update ───────────────────────────────────────────────────────
  describe('successful update', () => {
    it('should return 200 with the fully updated employee', async () => {
      const existing = await seed();

      const payload = {
        name:       'Updated Name',
        email:      'updated@example.com',
        department: 'Product',
        salary:     95000,
      };

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id:         existing.id,
        name:       payload.name,
        email:      payload.email,
        department: payload.department,
        salary:     payload.salary,
      });
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should persist the change — a subsequent GET returns updated data', async () => {
      const existing = await seed();

      await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ name: 'Jane Updated', email: 'jane.updated@example.com', salary: 80000 })
        .set('Accept', 'application/json');

      const res = await request(app)
        .get(`/api/v1/employees/${existing.id}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Jane Updated');
      expect(res.body.data.salary).toBe(80000);
    });

    it('should allow updating only salary (partial payload)', async () => {
      const existing = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ salary: 120000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Unchanged fields must be preserved
      expect(res.body.data.name).toBe(existing.name);
      expect(res.body.data.email).toBe(existing.email);
      expect(res.body.data.salary).toBe(120000);
    });
  });

  // ── Validation errors ───────────────────────────────────────────────────────
  describe('validation errors', () => {
    it('should return 400 when salary is negative', async () => {
      const existing = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ salary: -1000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });

    it('should return 400 when salary is zero', async () => {
      const existing = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ salary: 0 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/salary/i);
    });

    it('should return 400 when name is an empty string', async () => {
      const existing = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ name: '' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name/i);
    });

    it('should return 400 when email is an empty string', async () => {
      const existing = await seed();

      const res = await request(app)
        .put(`/api/v1/employees/${existing.id}`)
        .send({ email: '' })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });
  });

  // ── Not found ────────────────────────────────────────────────────────────────
  describe('not found', () => {
    it('should return 404 when the id does not exist', async () => {
      const res = await request(app)
        .put('/api/v1/employees/999999')
        .send({ salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  // ── Invalid id ───────────────────────────────────────────────────────────────
  describe('invalid id', () => {
    it('should return 400 when id is not a number', async () => {
      const res = await request(app)
        .put('/api/v1/employees/not-a-number')
        .send({ salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is zero', async () => {
      const res = await request(app)
        .put('/api/v1/employees/0')
        .send({ salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is negative', async () => {
      const res = await request(app)
        .put('/api/v1/employees/-1')
        .send({ salary: 50000 })
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });
  });
});
