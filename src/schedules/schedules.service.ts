import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.module';
import * as schema from '../db/schema';
import { courses, courseSchedules } from '../db/schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateScheduleDto, lecturerId: number) {
    const course = await this.verifyCourseOwnership(dto.courseId, lecturerId);
    if (!course) {
      throw new NotFoundException(`Course #${dto.courseId} not found`);
    }

    const [schedule] = await this.db
      .insert(courseSchedules)
      .values({
        courseId: dto.courseId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      })
      .returning();

    return schedule;
  }

  async findByCourse(courseId: number) {
    return this.db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.courseId, courseId));
  }

  async update(id: number, dto: UpdateScheduleDto, lecturerId: number) {
    const schedule = await this.findOneOrFail(id);
    await this.verifyCourseOwnership(schedule.courseId, lecturerId);

    const [updated] = await this.db
      .update(courseSchedules)
      .set(dto)
      .where(eq(courseSchedules.id, id))
      .returning();

    return updated;
  }

  async remove(id: number, lecturerId: number) {
    const schedule = await this.findOneOrFail(id);
    await this.verifyCourseOwnership(schedule.courseId, lecturerId);

    await this.db.delete(courseSchedules).where(eq(courseSchedules.id, id));

    return { success: true, message: `Schedule #${id} deleted successfully` };
  }

  private async findOneOrFail(id: number) {
    const [schedule] = await this.db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.id, id));
    if (!schedule) {
      throw new NotFoundException(`Schedule #${id} not found`);
    }
    return schedule;
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
