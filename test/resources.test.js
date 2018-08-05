import supertest from 'supertest';
import { expect } from 'chai';

import fs from 'fs';

import makeApp from '../src/app';
import { __RewireAPI__ as rewireAPI } from '../src/resources';
import { __RewireAPI__ as authRewireAPI } from '../src/auth';

let privkey = fs.readFileSync(process.env.JWT_PRIVATE_KEY);
let passphrase = process.env.JWT_PASS;

const genAccessToken = authRewireAPI.__get__('genAccessToken');


describe('As a platform user, I should be able to create, list and delete my resources', () => {
  let app;
  let JOE_USER = { id: 10, username: 'joe', roles: ['user'] };

  beforeEach(() => {
    app = makeApp();
  });

  describe('Authorization and authentication', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must require Authorization header', async () => {
      const res = await supertest(app.callback())
        .post('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({})
        .expect(403);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });
  });

  describe('List resources', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must list zero resources', async () => {
      rewireAPI.__Rewire__('db', {
        async findResourcesByOwnerId (ownerId, options) {
          expect(ownerId).to.be.deep.equal(10);
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve([]);
        }
      });

      const accessToken = genAccessToken(JOE_USER, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(0);
    });

    it('must list a paginated list of 10 resources on page 1 by default', async () => {
      rewireAPI.__Rewire__('db', {
        async findResourcesByOwnerId (ownerId, options) {
          expect(ownerId).to.be.deep.equal(10);
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve(new Array(10).fill({
            id: '72b9f5a2-76f9-466e-84f6-886cce3e50bb',
            name: 'avatar',
            createdAt: '2018-08-05T00:00:00Z',
            updatedAt: '2018-08-05T00:00:00Z'
          }));
        }
      });

      const accessToken = genAccessToken(JOE_USER, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(10);
    });

    it('must list a paginated list of 10 resources on page 2', async () => {
      rewireAPI.__Rewire__('db', {
        async findResourcesByOwnerId (ownerId, options) {
          expect(ownerId).to.be.deep.equal(10);
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 10
          });

          return Promise.resolve(new Array(10).fill({
            id: '72b9f5a2-76f9-466e-84f6-886cce3e50bb',
            name: 'avatar',
            createdAt: '2018-08-05T00:00:00Z',
            updatedAt: '2018-08-05T00:00:00Z'
          }));
        }
      });

      const accessToken = genAccessToken(JOE_USER, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
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
});

describe('As a platform administrator, I should be able to create, list and delete users` resources', () => {
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
        .post('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({})
        .expect(403);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });
  });

  xdescribe('Create resources', () => {
    let accessToken;
    before(() => {
      accessToken = genAccessToken({ id: 1, username: 'admin', roles: ['admin'] }, privkey, passphrase);
    });

    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must invalidate wrong/missing data', async () => {
      const res = await supertest(app.callback())
        .post('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      // Error response must comply to ApiResponse
      expectApiResponse(res);
    });

    it('must persist valid resource', async () => {
      rewireAPI.__Rewire__('db', {
        async createUser ({ username, email, roles }) {
          expect(username).to.be.equal('MockUSER');
          expect(email).to.be.equal('mock@mail.com');
          expect(roles).to.be.deep.equal(['user']);

          return Promise.resolve({ username, email, roles });
        }
      });
      const res = await supertest(app.callback())
        .post('/api/v1/resources')
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

  xdescribe('Update resource', () => {
    it('must reject non-existing resource', async () => {

    });

    it('must update', async () => {

    });

    it('must list a paginated list of 10 resources on page 2', async () => {

    });
  });

  describe('List resources', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must list zero resources', async () => {
      rewireAPI.__Rewire__('db', {
        async findResources (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve([]);
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(0);
    });

    it('must list a paginated list of 10 resources on page 1 by default', async () => {
      rewireAPI.__Rewire__('db', {
        async findResources (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 0
          });

          return Promise.resolve(new Array(10).fill({
            id: '72b9f5a2-76f9-466e-84f6-886cce3e50bb',
            name: 'avatar',
            createdAt: '2018-08-05T00:00:00Z',
            updatedAt: '2018-08-05T00:00:00Z'
          }));
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(200);

      expect(res.body).to.have.length(10);
    });

    it('must list a paginated list of 10 resources on page 2', async () => {
      rewireAPI.__Rewire__('db', {
        async findResources (criteria, options) {
          expect(criteria).to.be.deep.equal({});
          expect(options).to.be.deep.equal({
            limit: 10,
            offset: 10
          });

          return Promise.resolve(new Array(10).fill({
            id: '72b9f5a2-76f9-466e-84f6-886cce3e50bb',
            name: 'avatar',
            createdAt: '2018-08-05T00:00:00Z',
            updatedAt: '2018-08-05T00:00:00Z'
          }));
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources')
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

  xdescribe('Get resource', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown resource', async () => {
      rewireAPI.__Rewire__('db', {
        async findById (id) {
          expect(id).to.be.equal(99999);

          return Promise.reject(new Error('Not found'));
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      await supertest(app.callback())
        .get('/api/v1/resources/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(404);
    });

    it('must denies one non-admin user to another user`s resource', async () => {
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
        .get('/api/v1/resources/30')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(403);
    });

    it('must allow admin to access one user other than the owner of access token', async () => {
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

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      const res = await supertest(app.callback())
        .get('/api/v1/resources/20')
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

  xdescribe('Delete resource', () => {
    afterEach(() => {
      rewireAPI.__ResetDependency__('db');
    });

    it('must respond with 404 for an unknown resource', async () => {
      rewireAPI.__Rewire__('db', {
        async removeUserById (id) {
          expect(id).to.be.equal(99999);

          return Promise.reject(new Error('Not found'));
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      await supertest(app.callback())
        .delete('/api/v1/resources/99999')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(404);
    });

    it('must delete access token owner`s one resource', async () => {
      rewireAPI.__Rewire__('db', {
        async removeUserById (id) {
          expect(id).to.be.equal(100);

          return Promise.resolve();
        }
      });

      const accessToken = genAccessToken(ADMIN, privkey, passphrase);
      await supertest(app.callback())
        .delete('/api/v1/resources/100')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(204);
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
