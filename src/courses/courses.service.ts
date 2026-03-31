import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { courses } from '../db/schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { eq, count } from 'drizzle-orm';

import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(createCourseDto: CreateCourseDto, lecturerId: number) {
    const { code, name, creditWeight, quota } = createCourseDto;

    // Explicit application layer validation
    const [existing] = await this.db
      .select({ count: count() })
      .from(courses)
      .where(eq(courses.code, code));
    if (existing.count > 0) {
      throw new ConflictException(`Course with code ${code} already exists.`);
    }

    const [newCourse] = await this.db
      .insert(courses)
      .values({
        code,
        name,
        creditWeight,
        quota,
        lecturerId,
      })
      .returning();

    return newCourse;
  }

  async findAll() {
    return this.db.select().from(courses);
  }

  async findOne(id: number) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    if (!course) {
      throw new NotFoundException(`Course #${id} not found`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto) {
    const course = await this.findOne(id);

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const [existing] = await this.db
        .select({ count: count() })
        .from(courses)
        .where(eq(courses.code, updateCourseDto.code));
      if (existing.count > 0) {
        throw new ConflictException(
          `Course with code ${updateCourseDto.code} already exists.`,
        );
      }
    }

    const [updatedCourse] = await this.db
      .update(courses)
      .set(updateCourseDto)
      .where(eq(courses.id, id))
      .returning();

    return updatedCourse;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(courses).where(eq(courses.id, id));
    return { success: true, message: `Course #${id} deleted successfully` };
  }
}
