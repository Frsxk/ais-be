import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getApiInfo', () => {
    it('should return API information', () => {
      const appController = app.get(AppController);
      expect(appController.getApiInfo()).toEqual({
        name: 'AIS-NG API',
        status: 'ok',
        version: '1.0.0',
        documentation: '/api/docs',
      });
    });
  });
});
