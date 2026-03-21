import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest'; // Using * to avoid the previous signature issue
import { AppModule } from './../src/app.module';

describe('ProductionFlow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/production/printing (POST) - Fail without auth', () => {
    return (request as any)(app.getHttpServer())
      .post('/production/printing')
      .send({ some: 'data' })
      .expect(401);
  });

  it('/production/diecutting (POST) - Fail without auth', () => {
    return (request as any)(app.getHttpServer())
      .post('/production/diecutting')
      .send({ some: 'data' })
      .expect(401);
  });
});
