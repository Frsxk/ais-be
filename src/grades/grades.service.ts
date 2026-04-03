import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, ne, sum } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.module';
import * as schema from '../db/schema';
import {
  courses,
  enrollments,
  gradeComponents,
  gradePublications,
  studentGrades,
  users,
} from '../db/schema';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { SetScoreDto } from './dto/set-score.dto';

interface GradeScale {
  letter: string;
  gradePoint: number;
}

const GRADE_SCALE: { min: number; letter: string; gradePoint: number }[] = [
  { min: 85, letter: 'A', gradePoint: 4.0 },
  { min: 80, letter: 'A-', gradePoint: 3.7 },
  { min: 75, letter: 'B+', gradePoint: 3.3 },
  { min: 70, letter: 'B', gradePoint: 3.0 },
  { min: 65, letter: 'B-', gradePoint: 2.7 },
  { min: 60, letter: 'C+', gradePoint: 2.3 },
  { min: 55, letter: 'C', gradePoint: 2.0 },
  { min: 40, letter: 'D', gradePoint: 1.0 },
  { min: 0, letter: 'E', gradePoint: 0.0 },
];

function scoreToGrade(score: number): GradeScale {
  for (const entry of GRADE_SCALE) {
    if (score >= entry.min) {
      return { letter: entry.letter, gradePoint: entry.gradePoint };
    }
  }
  return { letter: 'E', gradePoint: 0.0 };
}

@Injectable()
export class GradesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async createComponent(dto: CreateComponentDto, lecturerId: number) {
    await this.verifyCourseOwnership(dto.courseId, lecturerId);

    const [weightResult] = await this.db
      .select({ total: sum(gradeComponents.weight) })
      .from(gradeComponents)
      .where(eq(gradeComponents.courseId, dto.courseId));
    const currentWeight = Number(weightResult?.total ?? 0);
    if (currentWeight + dto.weight > 100) {
      throw new BadRequestException(
        `Total weight would be ${currentWeight + dto.weight}%. Must not exceed 100%. Current: ${currentWeight}%`,
      );
    }

    const [component] = await this.db
      .insert(gradeComponents)
      .values(dto)
      .returning();

    return component;
  }

  async findComponents(courseId: number) {
    return this.db
      .select()
      .from(gradeComponents)
      .where(eq(gradeComponents.courseId, courseId));
  }

  async updateComponent(
    id: number,
    dto: UpdateComponentDto,
    lecturerId: number,
  ) {
    const component = await this.findComponentOrFail(id);
    await this.verifyCourseOwnership(component.courseId, lecturerId);

    if (dto.weight !== undefined) {
      const [weightResult] = await this.db
        .select({ total: sum(gradeComponents.weight) })
        .from(gradeComponents)
        .where(
          and(
            eq(gradeComponents.courseId, component.courseId),
            ne(gradeComponents.id, id),
          ),
        );
      const otherWeight = Number(weightResult?.total ?? 0);
      if (otherWeight + dto.weight > 100) {
        throw new BadRequestException(
          `Total weight would be ${otherWeight + dto.weight}%. Must not exceed 100%.`,
        );
      }
    }

    const [updated] = await this.db
      .update(gradeComponents)
      .set(dto)
      .where(eq(gradeComponents.id, id))
      .returning();

    return updated;
  }

  async deleteComponent(id: number, lecturerId: number) {
    const component = await this.findComponentOrFail(id);
    await this.verifyCourseOwnership(component.courseId, lecturerId);

    await this.db.delete(gradeComponents).where(eq(gradeComponents.id, id));

    return { success: true, message: `Component #${id} deleted` };
  }

  async setScore(dto: SetScoreDto, lecturerId: number) {
    const component = await this.findComponentOrFail(dto.componentId);
    await this.verifyCourseOwnership(component.courseId, lecturerId);

    const [enrollment] = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, dto.enrollmentId));
    if (!enrollment) {
      throw new NotFoundException(`Enrollment #${dto.enrollmentId} not found`);
    }
    if (enrollment.courseId !== component.courseId) {
      throw new BadRequestException(
        'Enrollment and component belong to different courses',
      );
    }

    const [existing] = await this.db
      .select()
      .from(studentGrades)
      .where(
        and(
          eq(studentGrades.enrollmentId, dto.enrollmentId),
          eq(studentGrades.componentId, dto.componentId),
        ),
      );

    if (existing) {
      const [updated] = await this.db
        .update(studentGrades)
        .set({ score: String(dto.score) })
        .where(eq(studentGrades.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(studentGrades)
      .values({
        enrollmentId: dto.enrollmentId,
        componentId: dto.componentId,
        score: String(dto.score),
      })
      .returning();

    return created;
  }

  async getScoresByCourse(courseId: number, lecturerId: number) {
    await this.verifyCourseOwnership(courseId, lecturerId);

    return this.db
      .select({
        gradeId: studentGrades.id,
        enrollmentId: studentGrades.enrollmentId,
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        componentId: studentGrades.componentId,
        componentName: gradeComponents.name,
        componentWeight: gradeComponents.weight,
        score: studentGrades.score,
      })
      .from(studentGrades)
      .innerJoin(
        gradeComponents,
        eq(studentGrades.componentId, gradeComponents.id),
      )
      .innerJoin(enrollments, eq(studentGrades.enrollmentId, enrollments.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId));
  }

  async togglePublish(courseId: number, lecturerId: number) {
    await this.verifyCourseOwnership(courseId, lecturerId);
    const [weightResult] = await this.db
      .select({ total: sum(gradeComponents.weight) })
      .from(gradeComponents)
      .where(eq(gradeComponents.courseId, courseId));
    const totalWeight = Number(weightResult?.total ?? 0);

    const [existing] = await this.db
      .select()
      .from(gradePublications)
      .where(eq(gradePublications.courseId, courseId));

    if (existing) {
      const newStatus = !existing.isPublished;
      if (newStatus && totalWeight !== 100) {
        throw new BadRequestException(
          `Cannot publish: total component weight is ${totalWeight}%, must be exactly 100%`,
        );
      }
      const [updated] = await this.db
        .update(gradePublications)
        .set({
          isPublished: newStatus,
          publishedAt: newStatus ? new Date() : null,
        })
        .where(eq(gradePublications.id, existing.id))
        .returning();
      return updated;
    }

    if (totalWeight !== 100) {
      throw new BadRequestException(
        `Cannot publish: total component weight is ${totalWeight}%, must be exactly 100%`,
      );
    }

    const [publication] = await this.db
      .insert(gradePublications)
      .values({
        courseId,
        isPublished: true,
        publishedAt: new Date(),
      })
      .returning();

    return publication;
  }

  async getPublishStatus(courseId: number) {
    const [publication] = await this.db
      .select()
      .from(gradePublications)
      .where(eq(gradePublications.courseId, courseId));
    return { isPublished: publication?.isPublished ?? false };
  }

  async getMyGradesForCourse(courseId: number, studentId: number) {
    const [publication] = await this.db
      .select()
      .from(gradePublications)
      .where(eq(gradePublications.courseId, courseId));
    if (!publication?.isPublished) {
      throw new ForbiddenException('Grades for this course are not published');
    }

    const [enrollment] = await this.db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId),
        ),
      );
    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    const scores = await this.db
      .select({
        componentName: gradeComponents.name,
        componentWeight: gradeComponents.weight,
        score: studentGrades.score,
      })
      .from(studentGrades)
      .innerJoin(
        gradeComponents,
        eq(studentGrades.componentId, gradeComponents.id),
      )
      .where(eq(studentGrades.enrollmentId, enrollment.id));

    const finalScore = this.calculateFinalScore(scores);
    const grade = scoreToGrade(finalScore);

    return {
      courseId,
      components: scores,
      finalScore: Math.round(finalScore * 100) / 100,
      letterGrade: grade.letter,
      gradePoint: grade.gradePoint,
    };
  }

  async getMyGradeSummary(studentId: number) {
    const studentEnrollments = await this.db
      .select({
        enrollmentId: enrollments.id,
        courseId: courses.id,
        courseCode: courses.code,
        courseName: courses.name,
        creditWeight: courses.creditWeight,
        semesterId: courses.semesterId,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, studentId));

    const courseGrades: {
      courseCode: string;
      courseName: string;
      creditWeight: number;
      semesterId: number;
      finalScore: number;
      letterGrade: string;
      gradePoint: number;
    }[] = [];

    for (const enrollment of studentEnrollments) {
      const [publication] = await this.db
        .select()
        .from(gradePublications)
        .where(eq(gradePublications.courseId, enrollment.courseId));
      if (!publication?.isPublished) continue;

      const scores = await this.db
        .select({
          componentWeight: gradeComponents.weight,
          score: studentGrades.score,
        })
        .from(studentGrades)
        .innerJoin(
          gradeComponents,
          eq(studentGrades.componentId, gradeComponents.id),
        )
        .where(eq(studentGrades.enrollmentId, enrollment.enrollmentId));

      const finalScore = this.calculateFinalScore(scores);
      const grade = scoreToGrade(finalScore);

      courseGrades.push({
        courseCode: enrollment.courseCode,
        courseName: enrollment.courseName,
        creditWeight: enrollment.creditWeight,
        semesterId: enrollment.semesterId,
        finalScore: Math.round(finalScore * 100) / 100,
        letterGrade: grade.letter,
        gradePoint: grade.gradePoint,
      });
    }

    const semesterMap = new Map<number, typeof courseGrades>();
    for (const cg of courseGrades) {
      const list = semesterMap.get(cg.semesterId) ?? [];
      list.push(cg);
      semesterMap.set(cg.semesterId, list);
    }

    const semesterGPAs = Array.from(semesterMap.entries()).map(
      ([semesterId, semesterCourses]) => ({
        semesterId,
        gpa: this.calculateGPA(semesterCourses),
        courses: semesterCourses,
      }),
    );

    const cumulativeGPA = this.calculateGPA(courseGrades);

    return { semesters: semesterGPAs, cumulativeGPA };
  }

  private calculateFinalScore(
    scores: { componentWeight: number; score: string }[],
  ): number {
    return scores.reduce(
      (total, s) => total + (s.componentWeight * Number(s.score)) / 100,
      0,
    );
  }

  private calculateGPA(
    courseGrades: { gradePoint: number; creditWeight: number }[],
  ): number {
    if (courseGrades.length === 0) return 0;
    const totalWeighted = courseGrades.reduce(
      (sum, c) => sum + c.gradePoint * c.creditWeight,
      0,
    );
    const totalCredits = courseGrades.reduce(
      (sum, c) => sum + c.creditWeight,
      0,
    );
    return totalCredits > 0
      ? Math.round((totalWeighted / totalCredits) * 100) / 100
      : 0;
  }

  private async findComponentOrFail(id: number) {
    const [component] = await this.db
      .select()
      .from(gradeComponents)
      .where(eq(gradeComponents.id, id));
    if (!component) {
      throw new NotFoundException(`Grade component #${id} not found`);
    }
    return component;
  }

  private async verifyCourseOwnership(courseId: number, lecturerId: number) {
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
    return course;
  }
}
