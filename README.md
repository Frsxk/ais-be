# AIS-NG Backend

Academic Information System backend built with NestJS, Drizzle ORM, and PostgreSQL.

## Tech Stack

- **Framework**: NestJS
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: JWT (Passport)

## Modules

| Module | Description |
|---|---|
| Auth | Registration, login, JWT-based RBAC (student/lecturer) |
| Semesters | Semester management (CRUD) |
| Courses | Course management with semester association |
| Schedules | Flexible course schedules (multiple sessions per week) |
| Enrollments | Course enrollment with credit limit, capacity check, and schedule conflict validation |
| Grades | Dynamic grade components, score entry, publication control, and GPA calculation |

## Setup

```bash
npm install
```

Create a `.env` file:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
```

Sync the database schema:

```bash
npx drizzle-kit push
```

## Running

```bash
# development
npm run start:dev

# production
npm run build
npm run start:prod
```

## Unit Testing

```bash
npm test
```

## API Overview

### Auth
- `POST /auth/register` — Register (student or lecturer)
- `POST /auth/login` — Login

### Semesters
- `POST /semesters` — Create (lecturer)
- `GET /semesters` — List all
- `GET /semesters/:id` — Get by ID
- `PUT /semesters/:id` — Update (lecturer)
- `DELETE /semesters/:id` — Delete (lecturer)

### Courses
- `POST /courses` — Create (lecturer)
- `GET /courses` — List all
- `GET /courses/:id` — Get by ID
- `PUT /courses/:id` — Update (lecturer)
- `DELETE /courses/:id` — Delete (lecturer)

### Schedules
- `POST /schedules` — Add session (lecturer)
- `GET /schedules/course/:courseId` — List by course
- `PUT /schedules/:id` — Update (lecturer)
- `DELETE /schedules/:id` — Delete (lecturer)

### Enrollments
- `POST /enrollments` — Enroll (student)
- `DELETE /enrollments/:courseId` — Drop (student)
- `GET /enrollments/me` — My enrollments (student)
- `GET /enrollments/course/:courseId` — Student roster (lecturer)

### Grades
- `POST /grades/components` — Add component (lecturer)
- `GET /grades/components/:courseId` — List components (lecturer)
- `PUT /grades/components/:id` — Update component (lecturer)
- `DELETE /grades/components/:id` — Delete component (lecturer)
- `POST /grades/scores` — Set score (lecturer)
- `GET /grades/scores/:courseId` — View scores (lecturer)
- `PUT /grades/publish/:courseId` — Toggle publication (lecturer)
- `GET /grades/my/:courseId` — My grades (student, published only)
- `GET /grades/my/summary` — GPA summary (student)
