import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['student', 'lecturer']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  creditWeight: integer('credit_weight').notNull(),
  quota: integer('quota').notNull(),
  lecturerId: integer('lecturer_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: integer('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.studentId, t.courseId)],
);
