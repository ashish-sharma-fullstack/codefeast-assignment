'use strict';

const request = require('supertest');
const app    = require('../src/app');
const prisma = require('../src/utils/prisma');

// ─── Seed helper ──────────────────────────────────────────────────────────────

const seed = (overrides = {}) =>
  prisma.employee.create({
    data: {
      name:     'Delete Me',
      email:    'delete.me@example.com',
      jobTitle: 'Operations Manager',
      country:  'IN',
      salary:   45000,
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

// ─── DELETE /api/v1/employees/:id ─────────────────────────────────────────────
describe('DELETE /api/v1/employees/:id', () => {

  // ── Successful deletion ─────────────────────────────────────────────────────
  describe('successful deletion', () => {
    it('should return 200 with success:true and a confirmation message', async () => {
      const existing = await seed();

      const res = await request(app)
        .delete(`/api/v1/employees/${existing.id}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should remove the record — a subsequent GET returns 404', async () => {
      const existing = await seed();

      await request(app)
        .delete(`/api/v1/employees/${existing.id}`)
        .set('Accept', 'application/json');

      const res = await request(app)
        .get(`/api/v1/employees/${existing.id}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(404);
    });

    it('should not affect other employees', async () => {
      const first  = await seed({ email: 'first@example.com' });
      const second = await seed({ email: 'second@example.com' });

      await request(app)
        .delete(`/api/v1/employees/${first.id}`)
        .set('Accept', 'application/json');

      const res = await request(app)
        .get(`/api/v1/employees/${second.id}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(second.id);
    });
  });

  // ── Not found ────────────────────────────────────────────────────────────────
  describe('not found', () => {
    it('should return 404 when the id does not exist', async () => {
      const res = await request(app)
        .delete('/api/v1/employees/999999')
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
        .delete('/api/v1/employees/not-a-number')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is zero', async () => {
      const res = await request(app)
        .delete('/api/v1/employees/0')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is negative', async () => {
      const res = await request(app)
        .delete('/api/v1/employees/-3')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });
  });
});
