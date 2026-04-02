import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SemestersService } from './semesters.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  createMockDb,
  createMockQueryBuilder,
} from '../test/mock-db.helper';

describe('SemestersService', () => {
  let service: SemestersService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemestersService,
        { provide: DB_CONNECTION, useValue: mockDb },
      ],
    }).compile();
    service = module.get<SemestersService>(SemestersService);
  });

  describe('create', () => {
    it('should create a semester when name is unique', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 0 }]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, name: '2025/2026 Ganjil', isActive: false },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.create({
        name: '2025/2026 Ganjil',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-01-31'),
      });

      expect(result.name).toBe('2025/2026 Ganjil');
    });

    it('should throw ConflictException for duplicate name', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 1 }]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(
        service.create({
          name: '2025/2026 Ganjil',
          startDate: new Date(),
          endDate: new Date(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if semester does not exist', async () => {
      const selectBuilder = createMockQueryBuilder([undefined]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a semester and return success', async () => {
      const selectBuilder = createMockQueryBuilder([{ id: 1, name: 'Sem1' }]);
      const deleteBuilder = createMockQueryBuilder(undefined);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.delete.mockReturnValueOnce(deleteBuilder);

      const result = await service.remove(1);
      expect(result.success).toBe(true);
    });
  });
});
