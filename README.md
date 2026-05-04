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
  jobTitle   String
  country    String
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
| `jobTitle` | string | ✅ | Non-empty, non-whitespace |
| `country` | string | ✅ | Non-empty (ISO 3166-1 alpha-2 recommended) |
| `salary` | number | ✅ | Positive number (floats accepted) |

```bash
curl -X POST http://localhost:3000/api/v1/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@acme.com","jobTitle":"Software Engineer","country":"IN","salary":90000}'
```

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "jobTitle": "Software Engineer",
    "country": "IN",
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
| `jobTitle` | string | Non-empty, non-whitespace |
| `country` | string | Non-empty |
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
| `country` | ✅ | ISO 3166-1 alpha-2 code (case-insensitive). `IN` → 10%, `US` → 12%, any other → 0% (net = gross) |

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
    "taxRate": 0.10,
    "taxAmount": 9000,
    "netSalary": 81000
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

Aggregates salary statistics for **employees whose `country` matches the given value** and computes net figures using that country's flat tax rate.

```bash
curl "http://localhost:3000/api/v1/metrics/salary?country=US"
```

```json
{
  "success": true,
  "data": {
    "country": "US",
    "taxRate": 0.12,
    "totalEmployees": 2,
    "totalGrossSalary": 200000,
    "totalNetSalary": 176000,
    "averageGrossSalary": 100000,
    "averageNetSalary": 88000,
    "minGrossSalary": 90000,
    "maxGrossSalary": 110000
  }
}
```

> All aggregate fields return `0` when no employees exist for the given country.

| Status | Condition |
|---|---|
| `200` | Computed successfully |
| `400` | Missing or blank `country` param |

---

#### `GET /api/v1/metrics/job?title=Engineer` — Job title metrics

Returns employee count and salary aggregates for employees whose `jobTitle` field **contains** the given title (case-insensitive, partial match).

```bash
curl "http://localhost:3000/api/v1/metrics/job?title=Engineer"
```

```json
{
  "success": true,
  "data": {
    "title": "Engineer",
    "totalEmployees": 2,
    "averageSalary": 100000,
    "minSalary": 80000,
    "maxSalary": 120000,
    "employees": [
      { "id": 1, "name": "Alice Dev", "jobTitle": "Software Engineer", "salary": 120000 },
      { "id": 2, "name": "Bob Dev",   "jobTitle": "Software Engineer", "salary": 80000  }
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
| `employees.test.js` | `POST /employees` | 9 |
| `employees.get.test.js` | `GET /employees`, `GET /employees/:id` | 8 |
| `employees.put.test.js` | `PUT /employees/:id` | 11 |
| `employees.delete.test.js` | `DELETE /employees/:id` | 7 |
| `employees.salary.test.js` | `GET /employees/:id/salary` | 9 |
| `employees.edge.test.js` | Duplicate email, ordering, float salary, PUT whitespace | 11 |
| `metrics.test.js` | `GET /metrics/salary`, `GET /metrics/job` | 14 |
| `app.test.js` | Health check, 404 handler | 2 |
| **Total** | | **71** |

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

1. **Flat tax rates** — Tax calculation uses simplified flat rates (IN: 10%, US: 12%, all others: 0% — net equals gross). Real tax systems are progressive and vary by year; this is intentionally simplified for the assignment.

2. **`jobTitle` is a free-text field** — The schema has no normalised job-title lookup table. The `/metrics/job` endpoint matches by partial, case-insensitive string against `jobTitle`. A production system would likely normalise this into a separate table.

3. **`country` drives both storage and tax** — Each employee record stores a `country` code. The `/metrics/salary` endpoint filters aggregates to only the employees whose stored `country` matches the query param, then applies that country's tax rate to compute net figures.

4. **SQLite for all environments** — The database is SQLite backed by `better-sqlite3`. The Prisma adapter layer means switching to PostgreSQL in production requires only a one-line change in `.env` and a one-line change in `src/utils/prisma.js`.

5. **Email is the unique identifier** — The schema enforces `email @unique`. Duplicate emails return `409 Conflict` regardless of the endpoint (POST or PUT).

6. **`PUT` is partial, not `PATCH`** — The endpoint is named `PUT` but behaves like `PATCH` (partial update). Only fields present in the request body are updated; omitted fields retain their current database values. This is a deliberate product decision — it simplifies the client-side contract.

7. **Salary is stored as a `Float`** — This allows fractional salaries (e.g., `75000.50`). For financial applications that require exact decimal arithmetic, a `Decimal` type or integer-cents storage would be preferable.

8. **No authentication / authorisation** — The API is open. A production deployment would add JWT-based auth middleware.

9. **Test isolation via `deleteMany`** — Each test wipes the entire `Employee` table in `beforeEach`. This is acceptable for SQLite in a test environment; it would be replaced by transactional rollbacks in a production-grade test setup.

---
## AI Usage Explanation

This project was developed using **AI-assisted pair programming** (primarily ChatGPT and Gemini) to accelerate development while maintaining strict engineering discipline. Below is a transparent breakdown of how AI was used and where human judgment guided the implementation.

---

### What the AI contributed

- **Project scaffolding & setup**  
  AI helped generate the initial Express application structure, Prisma schema for SQLite, and testing setup (Jest + Supertest), allowing faster bootstrapping without compromising structure.

- **TDD workflow execution**  
  For each feature (Employee CRUD, Salary Calculation, Salary Metrics), I provided the API contract and requirements.  
  AI assisted in:
  - Writing **failing test cases first (RED)**
  - Generating **minimal implementation (GREEN)**
  - Suggesting **refactoring improvements (REFACTOR)**  
  This ensured a consistent and disciplined TDD cycle.

- **Test case generation & edge case discovery**  
  AI helped expand test coverage by identifying edge cases such as:
  - Missing or invalid input fields (e.g., negative salary, empty strings)
  - Non-existent employee IDs (404 scenarios)
  - Country-based salary deduction variations (IN: 10%, US: 12%, others: 0%)
  - Empty dataset handling in salary metrics

- **Refactoring suggestions**  
  AI identified repetitive patterns (e.g., validation logic, error handling) and suggested improvements such as:
  - Centralized error handling middleware
  - Reusable validation utilities
  - Cleaner separation between controller, service, and data layers

- **Debugging assistance**  
  AI assisted in interpreting runtime errors (especially Prisma-related issues) and suggested fixes, which were then verified and adjusted manually.

---

### What required human judgment

- **API design decisions**  
  Decisions such as endpoint structure, response format consistency, and HTTP status codes were defined by me to ensure clarity and production-readiness.

- **Business logic interpretation**  
  Salary deduction rules (India 10%, US 12%, others 0%) and how they are applied were implemented carefully, ensuring correctness and simplicity.

- **Architecture choices**  
  I decided to follow a **layered architecture (controller → service → repository)** for maintainability, avoiding unnecessary complexity.

- **Validation and edge case scope**  
  Determining which validations to enforce (e.g., salary must be positive, required fields, handling empty datasets) was based on practical production considerations.

- **Code review & quality control**  
  All AI-generated code was reviewed, tested, and refined manually. In several cases, AI suggestions were modified to better align with requirements or improve clarity.

---

### Summary

AI significantly accelerated development (approximately **3–5× faster**) by handling repetitive and boilerplate tasks, especially in test generation and scaffolding.  

However, all **core decisions — API design, architecture, validation rules, and quality standards — were driven by me**.  

The final codebase reflects a balance between **AI efficiency and human engineering judgment**, ensuring it is maintainable, testable, and production-ready.