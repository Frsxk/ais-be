import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, eq, inArray, sql, sum } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.module';
import * as schema from '../db/schema';
import { courses, courseSchedules, enrollments, users } from '../db/schema';

const MAX_CREDITS = 24;

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async enroll(studentId: number, courseId: number) {
    return this.db.transaction(async (tx) => {
      const lockedRows = await tx.execute<{
        id: number;
        quota: number;
        credit_weight: number;
      }>(
        sql`SELECT id, quota, credit_weight FROM courses WHERE id = ${courseId} FOR UPDATE`,
      );
      const course = lockedRows[0];
      if (!course) {
        throw new NotFoundException(`Course #${courseId} not found`);
      }

      const [existing] = await tx
        .select({ count: count() })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.courseId, courseId),
          ),
        );
      if (existing.count > 0) {
        throw new ConflictException('Already enrolled in this course');
      }

      const [creditResult] = await tx
        .select({ total: sum(courses.creditWeight) })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.studentId, studentId));
      const currentCredits = Number(creditResult?.total ?? 0);
      if (currentCredits + course.credit_weight > MAX_CREDITS) {
        throw new BadRequestException(
          `Credit limit exceeded. Current: ${currentCredits}, Attempting to add: ${course.credit_weight}, Max: ${MAX_CREDITS}`,
        );
      }

      const [capacityResult] = await tx
        .select({ count: count() })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId));
      if (capacityResult.count >= course.quota) {
        throw new BadRequestException(
          `Class is full. Capacity: ${course.quota}`,
        );
      }

      await this.checkScheduleConflicts(studentId, courseId);

      const [enrollment] = await tx
        .insert(enrollments)
        .values({ studentId, courseId })
        .returning();

      return enrollment;
    });
  }

  async drop(studentId: number, courseId: number) {
    const [existing] = await this.db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId),
        ),
      );
    if (!existing) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.db
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId),
        ),
      );

    return { success: true, message: 'Course dropped successfully' };
  }

  async getMyEnrollments(studentId: number) {
    return this.db
      .select({
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
        courseId: courses.id,
        courseCode: courses.code,
        courseName: courses.name,
        creditWeight: courses.creditWeight,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, studentId));
  }

  async getStudentsByCourse(courseId: number, lecturerId: number) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    if (!course) {
      throw new NotFoundException(`Course #${courseId} not found`);
    }
    if (course.lecturerId !== lecturerId) {
      throw new ForbiddenException('You do not own this course');
    }

    return this.db
      .select({
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
        studentId: users.id,
        studentEmail: users.email,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId));
  }

  private async checkScheduleConflicts(
    studentId: number,
    targetCourseId: number,
  ) {
    const targetSchedules = await this.db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.courseId, targetCourseId));

    if (targetSchedules.length === 0) {
      return;
    }

    const enrolledRows = await this.db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    if (enrolledRows.length === 0) {
      return;
    }

    const enrolledCourseIds = enrolledRows.map((r) => r.courseId);

    const enrolledSchedules = await this.db
      .select({
        courseId: courseSchedules.courseId,
        dayOfWeek: courseSchedules.dayOfWeek,
        startTime: courseSchedules.startTime,
        endTime: courseSchedules.endTime,
        courseCode: courses.code,
        courseName: courses.name,
      })
      .from(courseSchedules)
      .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
      .where(inArray(courseSchedules.courseId, enrolledCourseIds));

    for (const target of targetSchedules) {
      for (const enrolled of enrolledSchedules) {
        if (
          target.dayOfWeek === enrolled.dayOfWeek &&
          target.startTime < enrolled.endTime &&
          enrolled.startTime < target.endTime
        ) {
          throw new BadRequestException(
            `Schedule conflict on ${target.dayOfWeek}: ` +
              `${target.startTime}-${target.endTime} overlaps with ` +
              `${enrolled.courseCode} (${enrolled.courseName}) ` +
              `${enrolled.startTime}-${enrolled.endTime}`,
          );
        }
      }
    }
  }
}
