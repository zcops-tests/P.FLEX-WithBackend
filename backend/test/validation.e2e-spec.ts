import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WorkOrder Validation', () => {
    it('/work-orders (POST) - Fail with missing ot_number', () => {
      return request(app.getHttpServer())
        .post('/work-orders')
        .send({ descripcion: 'Test' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('ot_number should not be empty');
        });
    });
  });

  describe('Printing Report Validation', () => {
    it('/production/printing/report (POST) - Fail with invalid date', () => {
      return request(app.getHttpServer())
        .post('/production/printing/report')
        .send({
          reported_at: 'invalid-date',
          machine_id: '861a337c-f1d2-45e3-85e6-c5e3d9370691',
          activities: [],
        })
        .expect(400);
    });
  });
});
