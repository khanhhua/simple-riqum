import supertest from 'supertest';
import chai, { expect } from 'chai';
import spies from 'chai-spies';

import fs from 'fs';

import makeApp from '../src/app';
import { __RewireAPI__ as rewireAPI } from '../src/users';
import { __RewireAPI__ as authRewireAPI } from '../src/auth';

chai.use(spies);

let privkey = fs.readFileSync(process.env.JWT_PRIVATE_KEY);
let passphrase = process.env.JWT_PASS;

const genAccessToken = authRewireAPI.__get__('genAccessToken');

describe('As a platform administrator, I should be able to create, list and delete users', () => {
  let app;
  let ADMIN = { id: 1, username: 'admin', roles: ['admin'] };

  beforeEach(() => {
    app = makeApp();
  });

  describe('Authorization and authentication', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must require Authorization header', async () => {
      const res = await supertest(app.callback())
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({})
        .expect(403);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });

    it('must deny user with non-"admin" roles from creating users', async () => {
      const accessToken = genAccessToken({ username: 'mockUser', roles: ['user'] }, privkey, passphrase);

      const res = await supertest(app.callback())
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'anewguy',
          email: 'newguy@mail.com'
        })
        .expect(403);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });

    it('must allow user with "admin" roles to create users', async () => {
      rewireAPI.__Rewire__('db', {
        async createUser () {
          return Promise.resolve({
            username: 'anewguy',
            email: 'newguy@mail.com'
          })
        }
      });

      const accessToken = genAccessToken({ username: 'mockUser', roles: ['admin'] }, privkey, passphrase);

      const res = await supertest(app.callback())
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'anewguy',
          email: 'newguy@mail.com'
        })
        .expect(201);

      // Error response must comply to ApiResponse
      expect(res.body.username).to.be.equal('anewguy');
      expect(res.body.email).to.be.equal('newguy@mail.com');
    });
  });

  describe('Create users', () => {
    let accessToken;
    before(() => {
      accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
    });

    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must invalidate wrong/missing data', async () => {
      const res = await supertest(app.callback())
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });

    it('must persist valid user', async () => {
      rewireAPI.__Rewire__('db', {
        async createUser ({ username, email, roles }) {
          expect(username).to.be.equal('MockUSER');
          expect(email).to.be.equal('mock@mail.com');
          expect(roles).to.be.deep.equal(['user']);

          return Promise.resolve({ username, email, roles });
        }
      });
      const res = await supertest(app.callback())
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'MockUSER',
          email: 'mock@mail.com'
        })
        .expect(201);

      expect(res.body.username).to.be.equal('MockUSER');
      expect(res.body.email).to.be.equal('mock@mail.com');
      expect(res.body.roles).to.be.deep.equal(['user']);
    });
  });

  describe('Update user', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown user', async () => {
      const updateUserById = chai.spy(() => Promise.reject(new Error('Not found')));

      rewireAPI.__Rewire__('db', {
        updateUserById
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      await supertest(app.callback())
        .put('/api/v1/users/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          roles: ['admin']
        })
        .expect(404);

      expect(updateUserById).to.have.been.called.with(99999, { roles: ['admin'] });
    });

    it('must update', async () => {
      const updateUserById = chai.spy(() => Promise.resolve({
        username: 'MockUSER',
        email: 'mock@mail.com',
        roles: ['admin']
      }));

      rewireAPI.__Rewire__('db', {
        updateUserById
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .put('/api/v1/users/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          roles: ['admin']
        })
        .expect(200);

      expect(updateUserById).to.have.been.called.with(99999, { roles: ['admin'] });
      expect(res.body.username).to.be.equal('MockUSER');
      expect(res.body.email).to.be.equal('mock@mail.com');
      expect(res.body.roles).to.be.deep.equal(['admin']);
    });
  });

  describe('List users', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must list zero users', async () => {
      rewireAPI.__Rewire__('db', {
        async findUsers (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve([]);
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(0);
    });

    it('must list a paginated list of 10 users on page 1 by default', async () => {
      rewireAPI.__Rewire__('db', {
        async findUsers (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve(new Array(10).fill({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          }));
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/users')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(10);
    });

    it('must list a paginated list of 10 users on page 2', async () => {
      rewireAPI.__Rewire__('db', {
        async findUsers (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 10
          });

          return Promise.resolve(new Array(10).fill({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          }));
        }
      });

      const accessToken = genAccessToken({ id:1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/users')
        .query({
          page: 2,
          size: 10
        })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(10);
    });
  });

  describe('Get user', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown user', async () => {
      rewireAPI.__Rewire__('db', {
        async findById (id) {
          expect(id).to.be.equal(99999);

          return Promise.reject(new Error('Not found'));
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      await supertest(app.callback())
        .get('/api/v1/users/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(404);
    });

    it('must denies one non-admin user to another user', async () => {
      rewireAPI.__Rewire__('db', {
        async findUserById (id) {
          expect(id).to.be.equal(30);

          return Promise.resolve({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          });
        }
      });

      const accessToken = genAccessToken({ id: 20, username: 'joe', roles: ['user'] }, privkey, passphrase);
      await supertest(app.callback())
        .get('/api/v1/users/30')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(403);
    });

    it('must get one non-admin user, the owner of access token', async () => {
      rewireAPI.__Rewire__('db', {
        async findUserById (id) {
          expect(id).to.be.equal(20);

          return Promise.resolve({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          });
        }
      });

      const accessToken = genAccessToken({ id: 20, username: 'mocka', roles: ['user'] }, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/users/20')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body.username).to.be.equal('mocka');
      expect(res.body.email).to.be.equal('mocka@mail.com');
      expect(res.body.roles).to.be.deep.equal(['user']);
    });

    it('must get one user other the owner of access token', async () => {
      rewireAPI.__Rewire__('db', {

        async findUserById (id) {
          expect(id).to.be.equal(20);

          return Promise.resolve({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          });
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/users/20')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body.username).to.be.equal('mocka');
      expect(res.body.email).to.be.equal('mocka@mail.com');
      expect(res.body.roles).to.be.deep.equal(['user']);
    });
  });

  describe('Delete users', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown user', async () => {
      rewireAPI.__Rewire__('db', {
        async removeUserById (id) {
          expect(id).to.be.equal(99999);

          return Promise.reject(new Error('Not found'));
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      await supertest(app.callback())
        .delete('/api/v1/users/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(404);
    });

    it('must not delete himself', async () => {
      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      await supertest(app.callback())
        .delete('/api/v1/users/1')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(403);
    });

    it('must delete one user other the owner of access token, and the user resources', async () => {
      rewireAPI.__Rewire__('db', {
        async removeUserById (id) {
          expect(id).to.be.equal(100);

          return Promise.resolve();
        }
      });

      const accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
      await supertest(app.callback())
        .delete('/api/v1/users/100')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(204);
    });
  });

  describe('Update quota for user', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown user', async () => {
      const updateUserQuotaById = chai.spy(() => Promise.reject(new Error('Not found')));

      rewireAPI.__Rewire__('db', {
        updateUserQuotaById
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      await supertest(app.callback())
        .put('/api/v1/users/99999/quota')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          limit: 500,
          unit: 'item'
        })
        .expect(404);

      expect(updateUserQuotaById).to.have.been.called.with(99999, {
        limit: 500,
        unit: 'item'
      });
    });

    it('must respond with 403 for an non-admin user', async () => {
      const accessToken = genAccessToken({ id: 10, username: 'joe', roles: ['user'] }, privkey, passphrase);
      await supertest(app.callback())
        .put('/api/v1/users/10/quota')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          limit: 500,
          unit: 'item'
        })
        .expect(403);
    });

    it('must update user quota', async () => {
      const updateUserQuotaById = chai.spy((userId, { limit, unit }) => ({
        limit,
        unit
      }));

      rewireAPI.__Rewire__('db', {
        updateUserQuotaById
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .put('/api/v1/users/10/quota')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          limit: 500,
          unit: 'item'
        })
        .expect(200);

      expect(updateUserQuotaById).to.have.been.called.with(10, { limit: 500, unit: 'item' });
      expect(res.body.limit).to.be.equal(500);
      expect(res.body.unit).to.be.equal('item');
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
