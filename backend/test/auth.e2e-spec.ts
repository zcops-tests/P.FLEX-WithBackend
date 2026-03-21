import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
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

  it('/auth/login (POST) - Fail with body', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nonexistent', password: 'password' })
      .expect(401);
  });

  it('/auth/me (GET) - Fail without token', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('/areas (GET) - Success with public/no token if allowed or 401 if restricted', () => {
    // Depending on RolesGuard settings, normally 401 without token
    return request(app.getHttpServer())
      .get('/areas')
      .expect(401);
  });

  it('/machines (GET) - Success with public/no token if allowed or 401 if restricted', () => {
    return request(app.getHttpServer())
      .get('/machines')
      .expect(401);
  });
});
