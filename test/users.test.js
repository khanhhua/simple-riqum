import supertest from 'supertest';
import { expect } from 'chai';

import fs from 'fs';
import jwt from 'jsonwebtoken';

import makeApp from '../src/app';
import { __RewireAPI__ as rewireAPI } from '../src/users';

let privkey = fs.readFileSync(process.env.JWT_PRIVATE_KEY);
let passphrase = process.env.JWT_PASS;

describe('As a platform administrator, I should be able to create, list and delete users and their resources', () => {
  let app;

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

    it('must deny user with non-"admin" roles from creating resources', async () => {
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

    it('must allow user with "admin" roles to create resources', async () => {
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
    it('must reject non-existing user', async () => {

    });

    it('must update', async () => {

    });

    it('must list a paginated list of 10 users on page 2', async () => {

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

    it('must denies one non-admin user to another user and his resources', async () => {
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

    it('must get one non-admin user and his resources, the owner of access token', async () => {
      rewireAPI.__Rewire__('db', {
        async findUserById (id) {
          expect(id).to.be.equal(20);

          return Promise.resolve({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user'],
            resources: new Array(10).fill({
              id: 1,
              name: 'Mock Resource Name',
              createdAt: '2018-08-05T00:00:00Z',
              updatedAt: '2018-08-05T00:00:00Z',
            }).map(({ id, name }, index) => ({ id: id + index, name }))
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
      expect(res.body.resources).to.have.length(10);

      for(let resource of res.body.resources) {
        expect(resource).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
      }
    });

    it('must get one user other the owner of access token, user has resources in case of admin access', async () => {
      rewireAPI.__Rewire__('db', {

        async findUserById (id) {
          expect(id).to.be.equal(20);

          return Promise.resolve({
            username: 'mocka',
            email: 'mocka@mail.com',
            roles: ['user']
          });
        },

        async findResourcesByUserId (userID) {
          expect(userID).to.be.equal(20);

          return Promise.resolve(new Array(10).fill({
            id: 1,
            name: 'Mock Resource Name',
            createdAt: '2018-08-05T00:00:00Z',
            updatedAt: '2018-08-05T00:00:00Z',
          }).map((it, index) => ({ ...it, id: it.id + index })))
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
      expect(res.body.resources).to.have.length(10);

      for(let resource of res.body.resources) {
        expect(resource).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
      }
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
});

function expectApiResponse(res) {
  expect(res.ok).to.be.false;
  expect(res.body.code).to.exist;
  expect(res.body.type).to.exist;
  expect(res.body.message).to.exist;
  // expect(res.body.errors).to.exist;
}

function genAccessToken(user, privkey, passphrase) {
  const { id, username, roles } = user;

  return jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    sub: id,
    username,
    roles
  }, {
    key: privkey,
    passphrase: passphrase
  }, {
    algorithm: 'RS512'
  });
}
