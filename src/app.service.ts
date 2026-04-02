import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'AIS-NG API',
      status: 'ok',
      version: '1.0.0',
      documentation: '/api/docs',
    };
  }
}
