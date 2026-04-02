import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  createMockDb,
  createMockQueryBuilder,
} from '../test/mock-db.helper';

describe('CoursesService', () => {
  let service: CoursesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: DB_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('create', () => {
    it('should create a course when code is unique', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 0 }]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, code: 'CS101', name: 'Intro CS', creditWeight: 3, quota: 30, semesterId: 1, lecturerId: 1 },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.create(
        { code: 'CS101', name: 'Intro CS', creditWeight: 3, quota: 30, semesterId: 1 },
        1,
      );

      expect(result.code).toBe('CS101');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate course code', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 1 }]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(
        service.create(
          { code: 'CS101', name: 'Intro CS', creditWeight: 3, quota: 30, semesterId: 1 },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a course by ID', async () => {
      const selectBuilder = createMockQueryBuilder([
        { id: 1, code: 'CS101', name: 'Intro CS' },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      const result = await service.findOne(1);
      expect(result.code).toBe('CS101');
    });

    it('should throw NotFoundException if course not found', async () => {
      const selectBuilder = createMockQueryBuilder([undefined]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a course and return success', async () => {
      const selectBuilder = createMockQueryBuilder([{ id: 1, code: 'CS101' }]);
      const deleteBuilder = createMockQueryBuilder(undefined);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.delete.mockReturnValueOnce(deleteBuilder);

      const result = await service.remove(1);
      expect(result.success).toBe(true);
    });
  });
});
