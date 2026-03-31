import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, eq, sum } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.module';
import * as schema from '../db/schema';
import { courses, enrollments, users } from '../db/schema';

const MAX_CREDITS = 24;

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async enroll(studentId: number, courseId: number) {
    // Verify course exists
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    if (!course) {
      throw new NotFoundException(`Course #${courseId} not found`);
    }

    // Check duplicate enrollment
    const [existing] = await this.db
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

    // Check credit limit
    const [creditResult] = await this.db
      .select({ total: sum(courses.creditWeight) })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, studentId));
    const currentCredits = Number(creditResult?.total ?? 0);
    if (currentCredits + course.creditWeight > MAX_CREDITS) {
      throw new BadRequestException(
        `Credit limit exceeded. Current: ${currentCredits}, Attempting to add: ${course.creditWeight}, Max: ${MAX_CREDITS}`,
      );
    }

    // Check class capacity
    const [capacityResult] = await this.db
      .select({ count: count() })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));
    if (capacityResult.count >= course.quota) {
      throw new BadRequestException(`Class is full. Capacity: ${course.quota}`);
    }

    const [enrollment] = await this.db
      .insert(enrollments)
      .values({ studentId, courseId })
      .returning();

    return enrollment;
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
    // Verify course exists and belongs to this lecturer
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
}
