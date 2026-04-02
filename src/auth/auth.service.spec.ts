import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  createMockDb,
  createMockQueryBuilder,
} from '../test/mock-db.helper';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: ReturnType<typeof createMockDb>;
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    mockDb = createMockDb();
    jwtService = { signAsync: jest.fn().mockResolvedValue('mock-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return a token', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 0 }]);
      const insertBuilder = createMockQueryBuilder([
        { id: 1, email: 'test@test.com', role: 'student' },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      mockDb.insert.mockReturnValueOnce(insertBuilder);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        role: 'student',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw ConflictException if email already exists', async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 1 }]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'password123',
          role: 'student',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return a token for valid credentials', async () => {
      const selectBuilder = createMockQueryBuilder([
        {
          id: 1,
          email: 'test@test.com',
          password: 'hashed-password',
          role: 'student',
        },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const selectBuilder = createMockQueryBuilder([undefined]);
      mockDb.select.mockReturnValueOnce(selectBuilder);

      await expect(
        service.login({ email: 'noone@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const selectBuilder = createMockQueryBuilder([
        { id: 1, email: 'test@test.com', password: 'hashed', role: 'student' },
      ]);
      mockDb.select.mockReturnValueOnce(selectBuilder);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
