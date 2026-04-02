import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  time,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['student', 'lecturer']);

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const semesters = pgTable('semesters', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  creditWeight: integer('credit_weight').notNull(),
  quota: integer('quota').notNull(),
  semesterId: integer('semester_id')
    .references(() => semesters.id, { onDelete: 'cascade' })
    .notNull(),
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

export const courseSchedules = pgTable('course_schedules', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
});

export const gradeComponents = pgTable('grade_components', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  weight: integer('weight').notNull(),
});

export const studentGrades = pgTable(
  'student_grades',
  {
    id: serial('id').primaryKey(),
    enrollmentId: integer('enrollment_id')
      .references(() => enrollments.id, { onDelete: 'cascade' })
      .notNull(),
    componentId: integer('component_id')
      .references(() => gradeComponents.id, { onDelete: 'cascade' })
      .notNull(),
    score: numeric('score', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [unique().on(t.enrollmentId, t.componentId)],
);

export const gradePublications = pgTable('grade_publications', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at'),
});
