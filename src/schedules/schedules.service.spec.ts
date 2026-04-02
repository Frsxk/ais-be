import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  createMockDb,
  createMockQueryBuilder,
} from '../test/mock-db.helper';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: DB_CONNECTION, useValue: mockDb },
      ],
    }).compile();
    service = module.get<SchedulesService>(SchedulesService);
  });

  describe('create', () => {
    it('should create a schedule for an owned course', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, courseId: 1, dayOfWeek: 'monday', startTime: '08:00', endTime: '10:00' },
      ]);
      mockDb.select.mockReturnValueOnce(courseSelect);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.create(
        { courseId: 1, dayOfWeek: 'monday', startTime: '08:00', endTime: '10:00' },
        10,
      );

      expect(result.dayOfWeek).toBe('monday');
    });

    it('should throw ForbiddenException if lecturer does not own the course', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 99 }]);
      mockDb.select.mockReturnValueOnce(courseSelect);

      await expect(
        service.create(
          { courseId: 1, dayOfWeek: 'monday', startTime: '08:00', endTime: '10:00' },
          10,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if course does not exist', async () => {
      const courseSelect = createMockQueryBuilder([undefined]);
      mockDb.select.mockReturnValueOnce(courseSelect);

      await expect(
        service.create(
          { courseId: 999, dayOfWeek: 'monday', startTime: '08:00', endTime: '10:00' },
          10,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a schedule owned by the lecturer', async () => {
      const scheduleSelect = createMockQueryBuilder([{ id: 1, courseId: 1 }]);
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const deleteBuilder = createMockQueryBuilder(undefined);
      mockDb.select
        .mockReturnValueOnce(scheduleSelect)
        .mockReturnValueOnce(courseSelect);
      mockDb.delete.mockReturnValueOnce(deleteBuilder);

      const result = await service.remove(1, 10);
      expect(result.success).toBe(true);
    });
  });
});
