import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  createMockDb,
  createMockQueryBuilder,
} from '../test/mock-db.helper';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: DB_CONNECTION, useValue: mockDb },
      ],
    }).compile();
    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  describe('enroll', () => {
    it('should enroll a student when all checks pass', async () => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue([{ id: 1, quota: 30, credit_weight: 3 }]),
        select: jest.fn(),
        insert: jest.fn(),
      };

      const dupBuilder = createMockQueryBuilder([{ count: 0 }]);
      const creditBuilder = createMockQueryBuilder([{ total: '0' }]);
      const capacityBuilder = createMockQueryBuilder([{ count: 0 }]);
      const scheduleBuilder = createMockQueryBuilder([]);

      mockTx.select
        .mockReturnValueOnce(dupBuilder)
        .mockReturnValueOnce(creditBuilder)
        .mockReturnValueOnce(capacityBuilder);
      mockDb.select.mockReturnValueOnce(scheduleBuilder);

      const insertBuilder = createMockQueryBuilder([
        { id: 1, studentId: 1, courseId: 1 },
      ]);
      mockTx.insert.mockReturnValueOnce(insertBuilder);

      mockDb.transaction.mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      const result = await service.enroll(1, 1);
      expect(result.studentId).toBe(1);
      expect(result.courseId).toBe(1);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue([]),
      };
      mockDb.transaction.mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(service.enroll(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already enrolled', async () => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue([{ id: 1, quota: 30, credit_weight: 3 }]),
        select: jest.fn(),
      };
      const dupBuilder = createMockQueryBuilder([{ count: 1 }]);
      mockTx.select.mockReturnValueOnce(dupBuilder);

      mockDb.transaction.mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(service.enroll(1, 1)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when credit limit exceeded', async () => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue([{ id: 1, quota: 30, credit_weight: 4 }]),
        select: jest.fn(),
      };
      const dupBuilder = createMockQueryBuilder([{ count: 0 }]);
      const creditBuilder = createMockQueryBuilder([{ total: '22' }]);
      mockTx.select
        .mockReturnValueOnce(dupBuilder)
        .mockReturnValueOnce(creditBuilder);

      mockDb.transaction.mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(service.enroll(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when class is full', async () => {
      const mockTx = {
        execute: jest.fn().mockResolvedValue([{ id: 1, quota: 2, credit_weight: 3 }]),
        select: jest.fn(),
      };
      const dupBuilder = createMockQueryBuilder([{ count: 0 }]);
      const creditBuilder = createMockQueryBuilder([{ total: '0' }]);
      const capacityBuilder = createMockQueryBuilder([{ count: 2 }]);
      mockTx.select
        .mockReturnValueOnce(dupBuilder)
        .mockReturnValueOnce(creditBuilder)
        .mockReturnValueOnce(capacityBuilder);

      mockDb.transaction.mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      );

      await expect(service.enroll(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('drop', () => {
    it('should drop an existing enrollment', async () => {
      const selectBuilder = createMockQueryBuilder([
        { id: 1, studentId: 1, courseId: 1 },
      ]);
      const deleteBuilder = createMockQueryBuilder(undefined);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.delete.mockReturnValueOnce(deleteBuilder);

      const result = await service.drop(1, 1);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      const selectBuilder = createMockQueryBuilder([undefined]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(service.drop(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
