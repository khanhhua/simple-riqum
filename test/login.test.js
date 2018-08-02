import supertest from 'supertest';
import { expect } from 'chai';

import makeApp from '../src/app';

describe('As a platform user, I need to authenticate with an email address and password', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
  });

  describe('Login validation', () => {
    it('must require email and password', async () => {
      const res = await supertest(app.callback())
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({})
        .expect(400);

      // Error response must comply to ApiResponse
      expect(res.ok).to.be.false;
      expect(res.body.code).to.exist;
      expect(res.body.type).to.exist;
      expect(res.body.message).to.exist;
      expect(res.body.errors).to.exist;
    });
  });

  it('must authenticate valid user', async () => {
    const res = await supertest(app.callback())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({
        email: 'user@mail.com',
        password: 'hashedpass'
      })
      .expect(200);

    expect(res.body.accessToken).to.exist;
  });
});