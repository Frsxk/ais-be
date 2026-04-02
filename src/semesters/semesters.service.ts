import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { count, eq } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.module';
import * as schema from '../db/schema';
import { semesters } from '../db/schema';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

@Injectable()
export class SemestersService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateSemesterDto) {
    const [existing] = await this.db
      .select({ count: count() })
      .from(semesters)
      .where(eq(semesters.name, dto.name));
    if (existing.count > 0) {
      throw new ConflictException(`Semester "${dto.name}" already exists`);
    }

    const [semester] = await this.db.insert(semesters).values(dto).returning();

    return semester;
  }

  async findAll() {
    return this.db.select().from(semesters);
  }

  async findOne(id: number) {
    const [semester] = await this.db
      .select()
      .from(semesters)
      .where(eq(semesters.id, id));
    if (!semester) {
      throw new NotFoundException(`Semester #${id} not found`);
    }
    return semester;
  }

  async update(id: number, dto: UpdateSemesterDto) {
    await this.findOne(id);

    if (dto.name) {
      const [existing] = await this.db
        .select({ count: count() })
        .from(semesters)
        .where(eq(semesters.name, dto.name));
      if (existing.count > 0) {
        throw new ConflictException(`Semester "${dto.name}" already exists`);
      }
    }

    const [updated] = await this.db
      .update(semesters)
      .set(dto)
      .where(eq(semesters.id, id))
      .returning();

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(semesters).where(eq(semesters.id, id));
    return { success: true, message: `Semester #${id} deleted successfully` };
  }
}
