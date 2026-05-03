# Codefeast Assignment — Employee API

A production-ready **REST API** for employee management, built with **Node.js + Express + Prisma ORM (SQLite)** and developed end-to-end using strict **Test-Driven Development (TDD)**.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Setup & Running Locally](#setup--running-locally)
4. [Environment Variables](#environment-variables)
5. [Database](#database)
6. [API Reference](#api-reference)
7. [Running Tests](#running-tests)
8. [Architecture & Design Decisions](#architecture--design-decisions)
9. [Assumptions](#assumptions)
10. [AI Usage Explanation](#ai-usage-explanation)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express.js 5 |
| ORM | Prisma 7 (driver adapter: `better-sqlite3`) |
| Database | SQLite (dev/test) — swap to PostgreSQL via `.env` |
| Testing | Jest 30 + Supertest |
| Security | Helmet, CORS |
| Logging | Morgan (dev only) |

---

## Project Structure

```
src/
├── app.js                      # Express app factory (no listen call)
├── server.js                   # Entry point — binds to PORT
├── controllers/
│   ├── employee.controller.js  # HTTP ↔ service adapters
│   └── metrics.controller.js
├── services/
│   ├── employee.service.js     # Business logic + orchestration
│   ├── salary.service.js       # Tax rules & salary calculation
│   └── metrics.service.js      # Aggregate metrics logic
├── repositories/
│   ├── employee.repository.js  # Prisma data access
│   └── metrics.repository.js   # Prisma aggregation queries
├── routes/
│   ├── employees.js            # /api/v1/employees router
│   └── metrics.js              # /api/v1/metrics router
├── middlewares/
│   └── errorHandler.js         # Global 404 + error handler
└── utils/
    ├── AppError.js             # Operational error class (carries HTTP status)
    ├── asyncHandler.js         # Eliminates try/catch in controllers
    ├── math.js                 # round2, nullToZero
    └── validate.js             # All input validation rules

tests/
├── employees.test.js           # POST /employees
├── employees.get.test.js       # GET /employees, GET /employees/:id
├── employees.put.test.js       # PUT /employees/:id
├── employees.delete.test.js    # DELETE /employees/:id
├── employees.salary.test.js    # GET /employees/:id/salary
├── employees.edge.test.js      # Duplicate email, ordering, float salary...
├── metrics.test.js             # GET /metrics/salary, GET /metrics/job
└── app.test.js                 # Health check, 404 handler
```

---

## Setup & Running Locally

### Prerequisites

- **Node.js ≥ 18** (tested on 22)
- **npm ≥ 9**

### 1 — Install dependencies

```bash
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env   # then edit DATABASE_URL if needed
```

The default `.env` ships a working SQLite config:

```
DATABASE_URL="file:./prisma/dev.db"
TEST_DATABASE_URL="file:./prisma/test.db"
PORT=3000
```

### 3 — Create the database & run migrations

```bash
npm run db:migrate
```

### 4 — Start the dev server

```bash
npm run dev          # nodemon — auto-restarts on file changes
# or
npm start            # plain node
```

The API is now available at **`http://localhost:3000`**.

### Optional — Prisma Studio (visual DB browser)

```bash
npm run db:studio
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` | Prisma connection string |
| `TEST_DATABASE_URL` | `file:./prisma/test.db` | Isolated DB for test runs |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | — | Set to `test` by test scripts; set to `development` for stack traces in responses |

> **Switching to PostgreSQL** — update `DATABASE_URL` to a `postgresql://` URI and change the adapter import in `src/utils/prisma.js` from `PrismaBetterSqlite3` to `PrismaPg`.

---

## Database

### Schema (Employee)

```prisma
model Employee {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  salary     Float
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Scripts

```bash
npm run db:migrate       # dev — creates migration + applies it
npm run db:migrate:prod  # prod — applies pending migrations only (no prompts)
npm run db:generate      # regenerates Prisma client after schema changes
```

---

## API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Common Response Envelope

```jsonc
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human-readable description" }
```

---

### Health Check

#### `GET /health`

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "timestamp": "2026-05-03T06:00:00.000Z" }
```

---

### Employees

#### `POST /api/v1/employees` — Create an employee

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | Non-empty, non-whitespace |
| `email` | string | ✅ | Non-empty; must be unique |
| `department` | string | ❌ | Any string |
| `salary` | number | ✅ | Positive number (floats accepted) |

```bash
curl -X POST http://localhost:3000/api/v1/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@acme.com","department":"Engineering","salary":90000}'
```

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "department": "Engineering",
    "salary": 90000,
    "createdAt": "2026-05-03T06:00:00.000Z",
    "updatedAt": "2026-05-03T06:00:00.000Z"
  }
}
```

| Status | Condition |
|---|---|
| `201` | Created successfully |
| `400` | Missing / invalid field |
| `409` | Email already exists |

---

#### `GET /api/v1/employees` — List all employees

Returns all employees ordered by `createdAt` descending (newest first).

```bash
curl http://localhost:3000/api/v1/employees
```

```json
{ "success": true, "data": [ { "id": 1, ... } ] }
```

| Status | Condition |
|---|---|
| `200` | Always (empty array when no records) |

---

#### `GET /api/v1/employees/:id` — Get employee by ID

```bash
curl http://localhost:3000/api/v1/employees/1
```

| Status | Condition |
|---|---|
| `200` | Found |
| `400` | `id` is not a positive integer |
| `404` | Not found |

---

#### `PUT /api/v1/employees/:id` — Partial update

Supports **partial payloads** — only the fields provided are updated; omitted fields are preserved.

```bash
curl -X PUT http://localhost:3000/api/v1/employees/1 \
  -H "Content-Type: application/json" \
  -d '{"salary":95000}'
```

| Field | Type | Rules when present |
|---|---|---|
| `name` | string | Non-empty, non-whitespace |
| `email` | string | Non-empty; must be unique |
| `salary` | number | Must be positive |

| Status | Condition |
|---|---|
| `200` | Updated successfully (returns updated employee) |
| `400` | Invalid field value or bad id |
| `404` | Employee not found |
| `409` | New email is already taken by another employee |

---

#### `DELETE /api/v1/employees/:id` — Delete an employee

```bash
curl -X DELETE http://localhost:3000/api/v1/employees/1
```

```json
{ "success": true, "message": "Employee deleted successfully" }
```

| Status | Condition |
|---|---|
| `200` | Deleted successfully |
| `400` | Invalid id |
| `404` | Not found |

---

#### `GET /api/v1/employees/:id/salary?country=IN` — Individual salary breakdown

Calculates net salary after applying the specified country's flat tax rate.

**Query parameters**

| Param | Required | Values |
|---|---|---|
| `country` | ✅ | ISO 3166-1 alpha-2 code (case-insensitive). `IN` → 30%, `US` → 25%, any other → 10% |

```bash
curl "http://localhost:3000/api/v1/employees/1/salary?country=IN"
```

```json
{
  "success": true,
  "data": {
    "employeeId": 1,
    "grossSalary": 90000,
    "country": "IN",
    "taxRate": 0.30,
    "taxAmount": 27000,
    "netSalary": 63000
  }
}
```

| Status | Condition |
|---|---|
| `200` | Calculated successfully |
| `400` | Missing `country` param or invalid id |
| `404` | Employee not found |

---

### Metrics

#### `GET /api/v1/metrics/salary?country=IN` — Aggregate salary metrics

Aggregates salary statistics across **all employees** and computes net figures using the given country's tax rate.

```bash
curl "http://localhost:3000/api/v1/metrics/salary?country=US"
```

```json
{
  "success": true,
  "data": {
    "country": "US",
    "taxRate": 0.25,
    "totalEmployees": 5,
    "totalGrossSalary": 400000,
    "totalNetSalary": 300000,
    "averageGrossSalary": 80000,
    "averageNetSalary": 60000,
    "minGrossSalary": 50000,
    "maxGrossSalary": 120000
  }
}
```

> All aggregate fields return `0` when there are no employees.

| Status | Condition |
|---|---|
| `200` | Computed successfully |
| `400` | Missing or blank `country` param |

---

#### `GET /api/v1/metrics/job?title=Engineering` — Job / department metrics

Returns employee count and salary aggregates for employees whose `department` field **contains** the given title (case-insensitive, partial match).

```bash
curl "http://localhost:3000/api/v1/metrics/job?title=Eng"
```

```json
{
  "success": true,
  "data": {
    "title": "Eng",
    "totalEmployees": 2,
    "averageSalary": 100000,
    "minSalary": 80000,
    "maxSalary": 120000,
    "employees": [
      { "id": 1, "name": "Alice Dev", "department": "Engineering", "salary": 120000 },
      { "id": 2, "name": "Bob Dev",   "department": "Engineering", "salary": 80000  }
    ]
  }
}
```

> Returns zeros and an empty `employees` array when no records match.

| Status | Condition |
|---|---|
| `200` | Computed successfully |
| `400` | Missing or blank `title` param |

---

## Running Tests

```bash
npm test                  # single run (sequential, force-exits)
npm run test:watch        # interactive watch mode
npm run test:coverage     # generates coverage report in ./coverage/
```

### Test suite overview

| File | Endpoint | Tests |
|---|---|---|
| `employees.test.js` | `POST /employees` | 7 |
| `employees.get.test.js` | `GET /employees`, `GET /employees/:id` | 8 |
| `employees.put.test.js` | `PUT /employees/:id` | 11 |
| `employees.delete.test.js` | `DELETE /employees/:id` | 7 |
| `employees.salary.test.js` | `GET /employees/:id/salary` | 9 |
| `employees.edge.test.js` | Duplicate email, ordering, float salary, PUT whitespace | 11 |
| `metrics.test.js` | `GET /metrics/salary`, `GET /metrics/job` | 14 |
| `app.test.js` | Health check, 404 handler | 2 |
| **Total** | | **69** |

All tests are isolated: `beforeEach` wipes the database; `afterAll` disconnects Prisma.

---

## Architecture & Design Decisions

### Layered architecture

```
HTTP Request
    │
    ▼
Controller          ← HTTP adapter (req → service → res). No business logic.
    │
    ▼
Service             ← Validation, orchestration, business rules, 404 guards.
    │
    ▼
Repository          ← Prisma data access. No logic, no validation.
    │
    ▼
Database (SQLite)
```

### Key decisions

| Decision | Rationale |
|---|---|
| **TDD** — tests written before every feature | Contracts are defined upfront; regressions are caught instantly |
| `AppError` operational error class | Separates expected errors (400, 404, 409) from unexpected bugs (500) — error handler renders them differently |
| `asyncHandler` wrapper | Eliminates repeated `try/catch/next(err)` across all controller methods |
| `_findOrThrow` private helper | The `validateId → findById → 404` sequence was duplicated 4 times; one helper owns it |
| Validate **before** DB lookup on PUT | Cheap validation runs first; avoids a DB round-trip on clearly invalid input |
| `validateUpdateEmployee` uses `'field' in data` | Partial update logic — only validates a field if the client actually sent it |
| Tax rules in `salary.service.js` | Business rules belong in the service layer, not in `utils/` which should be domain-agnostic |
| `math.js` shared utilities | `round2` and `nullToZero` were duplicated across two services; centralised in one place |
| Prisma `aggregate` for metrics | Single DB round-trip computes count, sum, avg, min, max atomically |
| P2002 → 409 Conflict in error handler | Prisma unique-constraint errors are expected/operational; surfaced to clients with the offending field name |

---

## Assumptions

1. **Flat tax rates** — Tax calculation uses simplified flat rates (IN: 30%, US: 25%, all others: 10%). Real tax systems are progressive and vary by year; this is intentionally simplified for the assignment.

2. **`department` is a free-text field** — The schema has no `department` lookup table. The `/metrics/job` endpoint matches by partial string. A production system would likely normalise this into a separate table.

3. **SQLite for all environments** — The database is SQLite backed by `better-sqlite3`. The Prisma adapter layer means switching to PostgreSQL in production requires only a one-line change in `.env` and a one-line change in `src/utils/prisma.js`.

4. **Email is the unique identifier** — The schema enforces `email @unique`. Duplicate emails return `409 Conflict` regardless of the endpoint (POST or PUT).

5. **`PUT` is partial, not `PATCH`** — The endpoint is named `PUT` but behaves like `PATCH` (partial update). Only fields present in the request body are updated; omitted fields retain their current database values. This is a deliberate product decision — it simplifies the client-side contract.

6. **Salary is stored as a `Float`** — This allows fractional salaries (e.g., `75000.50`). For financial applications that require exact decimal arithmetic, a `Decimal` type or integer-cents storage would be preferable.

7. **No authentication / authorisation** — The API is open. A production deployment would add JWT-based auth middleware.

8. **Test isolation via `deleteMany`** — Each test wipes the entire `Employee` table in `beforeEach`. This is acceptable for SQLite in a test environment; it would be replaced by transactional rollbacks in a production-grade test setup.

---

## AI Usage Explanation

This project was developed **pair-programming with an AI coding assistant (Antigravity / Gemini)** throughout the entire session. Here is an honest account of how AI was used and where human judgment directed the work:

### What the AI contributed

- **Boilerplate generation** — Initial Express app skeleton, Prisma schema, and middleware wiring were generated rapidly to avoid rote setup work.
- **TDD execution** — For each feature, I described the endpoint contract; the AI wrote the failing test file first, then the minimal implementation to make it pass. This kept the TDD discipline strict.
- **Refactoring suggestions** — The AI identified duplicated patterns (the 4× `validateId + findById + throw 404` sequence; the 6× `try/catch/next` blocks) and proposed extracting `_findOrThrow` and `asyncHandler` respectively.
- **Bug discovery through tests** — When tests were written for `name: '   '` (whitespace-only), the AI caught that `!!name` passes for whitespace strings and tightened the check to `!!name.trim()`.
- **Adapter-specific debugging** — Identifying that Prisma 7 + `better-sqlite3` stores P2002 constraint data in `meta.driverAdapterError.cause.constraint.fields` (not `meta.target`) required inspecting the live error object; the AI helped instrument and interpret it.

### What required human judgment

- **API contract decisions** — Choosing `PUT` for partial updates (vs requiring `PATCH`), deciding on a `message` field for DELETE responses, choosing flat tax rates — these were product/design decisions made by me.
- **Architecture direction** — The decision to keep tax rules in `salary.service.js` rather than a config file, and to use `_findOrThrow` rather than a more complex Repository pattern, came from me.
- **Assumption scoping** — Deciding which edge cases matter (duplicate email = 409, whitespace names = 400, SQLite LIKE case-sensitivity) was my judgment call.
- **Reviewing every diff** — All AI-generated code was reviewed before acceptance. Several edits were redirected when the AI's first attempt missed a detail (e.g., the SQLite P2002 meta path).

### Summary

AI accelerated the mechanical work by roughly 4–5×. The design decisions, contract definitions, and quality bar were set and maintained by me. The result is code I can reason about and own — not code I accepted blindly.
