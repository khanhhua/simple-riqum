import supertest from 'supertest';
import { expect } from 'chai';

import makeApp from '../src/app';
import { __RewireAPI__ as rewireAPI } from '../src/auth';

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
      ensureErrorResponse(res);
    });
  });

  describe('Login with valid inputs', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must authenticate valid user', async () => {
      rewireAPI.__Rewire__('db', {
        findUserByCredential: async function (email, password) {
          return Promise.resolve({
            email,
            username: 'MockUSER',
            roles: ['admin']
          });
        }
      });

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

    it('must reject non-existent user', async () => {
      rewireAPI.__Rewire__('db', {
        findUserByCredential: async function (email, password) {
          return Promise.reject(new Error('No such user'));
        }
      });

      const res = await supertest(app.callback())
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          email: 'user@mail.com',
          password: 'hashedpass'
        })
        .expect(403);

      expect(res.body.accessToken).to.be.undefined;

      ensureErrorResponse(res);
    });
  });
});

function ensureErrorResponse(res) {
  expect(res.ok).to.be.false;
  expect(res.body.code).to.exist;
  expect(res.body.type).to.exist;
  expect(res.body.message).to.exist;
  // expect(res.body.errors).to.exist;
}