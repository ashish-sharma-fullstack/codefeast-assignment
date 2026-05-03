'use strict';

const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/utils/prisma');

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const FIXTURES = [
  { name: 'Alice Walker',  email: 'alice@example.com',  department: 'Engineering', salary: 90000 },
  { name: 'Bob Martin',   email: 'bob@example.com',    department: 'Design',       salary: 70000 },
  { name: 'Carol Strong', email: 'carol@example.com',  department: 'HR',           salary: 55000 },
];

const seedEmployees = () =>
  Promise.all(FIXTURES.map((data) => prisma.employee.create({ data })));

// ─── Shared lifecycle ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── GET /api/v1/employees ────────────────────────────────────────────────────
describe('GET /api/v1/employees', () => {
  describe('when no employees exist', () => {
    it('should return 200 with an empty array', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('when employees exist', () => {
    it('should return 200 with all employees', async () => {
      await seedEmployees();

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(FIXTURES.length);
    });

    it('should return employees with the expected shape', async () => {
      await seedEmployees();

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Accept', 'application/json');

      // Every item must carry these fields
      res.body.data.forEach((employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('salary');
        expect(employee).toHaveProperty('createdAt');
      });
    });
  });
});

// ─── GET /api/v1/employees/:id ────────────────────────────────────────────────
describe('GET /api/v1/employees/:id', () => {
  describe('when the employee exists', () => {
    it('should return 200 with the matching employee', async () => {
      const [created] = await seedEmployees();

      const res = await request(app)
        .get(`/api/v1/employees/${created.id}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id:         created.id,
        name:       created.name,
        email:      created.email,
        department: created.department,
        salary:     created.salary,
      });
      expect(res.body.data.createdAt).toBeDefined();
    });
  });

  describe('not found', () => {
    it('should return 404 when the id does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/employees/999999')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('invalid id', () => {
    it('should return 400 when id is not a number', async () => {
      const res = await request(app)
        .get('/api/v1/employees/not-a-number')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is zero', async () => {
      const res = await request(app)
        .get('/api/v1/employees/0')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });

    it('should return 400 when id is negative', async () => {
      const res = await request(app)
        .get('/api/v1/employees/-5')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/id/i);
    });
  });
});
