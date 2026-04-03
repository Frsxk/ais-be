import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { DB_CONNECTION } from '../db/db.module';
import { createMockDb, createMockQueryBuilder } from '../test/mock-db.helper';

describe('GradesService', () => {
  let service: GradesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradesService, { provide: DB_CONNECTION, useValue: mockDb }],
    }).compile();
    service = module.get<GradesService>(GradesService);
  });

  describe('createComponent', () => {
    it('should create a component when weight is valid', async () => {
      // verifyCourseOwnership
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      // Current weight sum
      const weightSelect = createMockQueryBuilder([{ total: '40' }]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, courseId: 1, name: 'Mid-Term', weight: 30 },
      ]);

      mockDb.select
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(weightSelect);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.createComponent(
        { courseId: 1, name: 'Mid-Term', weight: 30 },
        10,
      );

      expect(result.name).toBe('Mid-Term');
    });

    it('should throw BadRequestException when total weight exceeds 100%', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const weightSelect = createMockQueryBuilder([{ total: '80' }]);

      mockDb.select
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(weightSelect);

      await expect(
        service.createComponent({ courseId: 1, name: 'Extra', weight: 30 }, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if lecturer does not own the course', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 99 }]);
      mockDb.select.mockReturnValueOnce(courseSelect);

      await expect(
        service.createComponent({ courseId: 1, name: 'Test', weight: 50 }, 10),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setScore', () => {
    it('should create a new score entry', async () => {
      const componentSelect = createMockQueryBuilder([{ id: 1, courseId: 1 }]);
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const enrollmentSelect = createMockQueryBuilder([{ id: 1, courseId: 1 }]);
      const existingSelect = createMockQueryBuilder([undefined]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, enrollmentId: 1, componentId: 1, score: '85.00' },
      ]);

      mockDb.select
        .mockReturnValueOnce(componentSelect)
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(enrollmentSelect)
        .mockReturnValueOnce(existingSelect);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.setScore(
        { enrollmentId: 1, componentId: 1, score: 85 },
        10,
      );

      expect(result.score).toBe('85.00');
    });

    it('should throw BadRequestException if enrollment and component are for different courses', async () => {
      const componentSelect = createMockQueryBuilder([{ id: 1, courseId: 1 }]);
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const enrollmentSelect = createMockQueryBuilder([
        { id: 1, courseId: 99 },
      ]);

      mockDb.select
        .mockReturnValueOnce(componentSelect)
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(enrollmentSelect);

      await expect(
        service.setScore({ enrollmentId: 1, componentId: 1, score: 85 }, 10),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getScoresByCourse', () => {
    it('should return scores with student details', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const scoresSelect = createMockQueryBuilder([
        {
          gradeId: 1,
          enrollmentId: 1,
          studentId: 1,
          studentName: 'John Doe',
          studentEmail: 'john@doe.com',
          componentId: 1,
          componentName: 'Mid-Term',
          componentWeight: 40,
          score: '90.00',
        },
      ]);

      mockDb.select
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(scoresSelect);

      const result = await service.getScoresByCourse(1, 10);
      expect(result).toHaveLength(1);
      expect(result[0].studentName).toBe('John Doe');
      expect(result[0].studentEmail).toBe('john@doe.com');
    });
  });

  describe('togglePublish', () => {
    it('should publish grades when total weight is 100%', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const weightSelect = createMockQueryBuilder([{ total: '100' }]);
      const pubSelect = createMockQueryBuilder([undefined]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, courseId: 1, isPublished: true },
      ]);

      mockDb.select
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(weightSelect)
        .mockReturnValueOnce(pubSelect);
      mockDb.insert.mockReturnValueOnce(insertBuilder);

      const result = await service.togglePublish(1, 10);
      expect(result.isPublished).toBe(true);
    });

    it('should throw BadRequestException when weight is not 100%', async () => {
      const courseSelect = createMockQueryBuilder([{ id: 1, lecturerId: 10 }]);
      const weightSelect = createMockQueryBuilder([{ total: '80' }]);
      const pubSelect = createMockQueryBuilder([undefined]);

      mockDb.select
        .mockReturnValueOnce(courseSelect)
        .mockReturnValueOnce(weightSelect)
        .mockReturnValueOnce(pubSelect);

      await expect(service.togglePublish(1, 10)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMyGradesForCourse', () => {
    it('should throw ForbiddenException when grades are unpublished', async () => {
      const pubSelect = createMockQueryBuilder([{ isPublished: false }]);
      mockDb.select.mockReturnValueOnce(pubSelect);

      await expect(service.getMyGradesForCourse(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when student is not enrolled', async () => {
      const pubSelect = createMockQueryBuilder([{ isPublished: true }]);
      const enrollSelect = createMockQueryBuilder([undefined]);
      mockDb.select
        .mockReturnValueOnce(pubSelect)
        .mockReturnValueOnce(enrollSelect);

      await expect(service.getMyGradesForCourse(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return grades with final score and letter grade', async () => {
      const pubSelect = createMockQueryBuilder([{ isPublished: true }]);
      const enrollSelect = createMockQueryBuilder([{ id: 1 }]);
      const scoresSelect = createMockQueryBuilder([
        { componentName: 'Mid-Term', componentWeight: 40, score: '90' },
        { componentName: 'Final', componentWeight: 60, score: '80' },
      ]);

      mockDb.select
        .mockReturnValueOnce(pubSelect)
        .mockReturnValueOnce(enrollSelect)
        .mockReturnValueOnce(scoresSelect);

      const result = await service.getMyGradesForCourse(1, 1);

      // finalScore = (40*90/100) + (60*80/100) = 36 + 48 = 84
      expect(result.finalScore).toBe(84);
      expect(result.letterGrade).toBe('A-');
      expect(result.gradePoint).toBe(3.7);
    });
  });

  describe('getMyGradeSummary', () => {
    it('should return empty semesters and 0 GPA when no published courses', async () => {
      const enrollSelect = createMockQueryBuilder([]);
      mockDb.select.mockReturnValueOnce(enrollSelect);

      const result = await service.getMyGradeSummary(1);
      expect(result.semesters).toHaveLength(0);
      expect(result.cumulativeGPA).toBe(0);
    });
  });
});
