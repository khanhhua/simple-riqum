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
    const accessToken = genAccessToken({ username: 'mockUser', roles: ['admin'] }, privkey, passphrase);

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
    before(async () => {
      // TODO Insert 20 users
    });

    it('must list zero users', async () => {

    });

    it('must list a paginated list of 10 users on page 1', async () => {

    });

    it('must list a paginated list of 10 users on page 2', async () => {

    });
  });

  describe('Get user', () => {
    before(async () => {
      // TODO Insert 2 users
      // 1 user doesn't have resources
    });

    it('must respond with 404 for an unknown user', async () => {

    });

    it('must get one non-admin user, the owner of the token', async () => {

    });

    it('must get one non-admin user and his resources, the owner of the token', async () => {

    });

    it('must get one user other the owner of access token in case of admin access', async () => {

    });

    it('must get one user other the owner of access token, user has resources in case of admin access', async () => {

    });
  });


  describe('Delete users', () => {
    before(async () => {
      // TODO Insert 2 users
      // 1 user doesn't have resources
    });

    it('must respond with 404 for an unknown user', async () => {

    });

    it('must delete one user other the owner of access token, and the user resources', async () => {

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
  const { username, roles } = user;

  return jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    sub: username,
    roles
  }, {
    key: privkey,
    passphrase: passphrase
  }, {
    algorithm: 'RS512'
  });
}
