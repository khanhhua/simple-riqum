import supertest from 'supertest';
import { expect } from 'chai';

import fs from 'fs';
import jwt from 'jsonwebtoken';

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
      expectApiResponse(res);
    });
  });

  describe('Login with valid inputs', () => {
    let pubkey;
    before(() => {
      pubkey = fs.readFileSync(process.env.JWT_PUBLIC_KEY);
    });

    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must authenticate valid user', async () => {
      rewireAPI.__Rewire__('db', {
        findUserByCredential: async function (email, password) {
          expect(email).to.be.equal('user@mail.com');
          expect(password).to.be.equal('hashedpass');

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

      const { accessToken } = res.body;
      const decrypted = jwt.verify(accessToken, pubkey, { algorithms: ['RS512'] });
      expect(decrypted).to.exist;
      expect(decrypted.sub).to.be.equal('MockUSER');
      expect(decrypted.iat).to.exist;
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

      expectApiResponse(res);
    });
  });
});

function expectApiResponse(res) {
  expect(res.ok).to.be.false;
  expect(res.body.code).to.exist;
  expect(res.body.type).to.exist;
  expect(res.body.message).to.exist;
  // expect(res.body.errors).to.exist;
}
