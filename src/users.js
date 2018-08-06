import debug from 'debug';

import Router from 'koa-router';
import { protect } from './auth';
import * as db from './db';

const dbg = debug('simple-riqum:users');

export default function (app, baseUrl) {
  dbg(`Mounting users handlers at ${baseUrl}`);

  const router = new Router({
    prefix: baseUrl
  });

  const adminOnlyRules = {
    allowed: ['admin']
  };
  const ownerOnlyRules = {
    allowed: ['admin', 'owner']
  };

  router.get('/users', protect(adminOnlyRules), findUsers);
  router.post('/users', protect(adminOnlyRules), createUser);

  router.get('/users/me', protect(ownerOnlyRules), getMyUser);
  router.get('/users/:id', protect(ownerOnlyRules), getUser);
  router.put('/users/:id', protect(adminOnlyRules), updateUser);
  router.delete('/users/:id', protect(adminOnlyRules), deleteUser);

  router.put('/users/:id/quota', protect(adminOnlyRules), updateUserQuota);

  app.use(router.routes());
  app.use(router.allowedMethods());
}

async function findUsers(ctx) {
  const criteria = ctx.request.query.q || {};
  const { page = '1', size = '10' } = ctx.request.query;
  const options = {
    limit: parseInt(size, 10),
    offset: (parseInt(page, 10) - 1) * size
  };

  const result = await db.findUsers(criteria, options);
  ctx.body = result;
}

async function getMyUser(ctx) {
  const { username } = ctx.user;

  try {
    const result = await db.findUserByUsername(username);
    ctx.body = result;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

async function getUser(ctx) {
  const { id } = ctx.params;

  try {
    const userID = parseInt(id, 10);

    const user = await db.findUserById(userID);

    ctx.body = user;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

async function createUser(ctx) {
  const { body: { username, email, password, roles=['user'] } } = ctx.request;

  const result = await db.createUser({ username, email, password, roles });

  ctx.body = result;
  ctx.status = 201;
}

async function updateUser(ctx) {
  const { id } = ctx.params;
  const { body: { email, roles } } = ctx.request;

  try {
    const updateData = omitUndefines({ email, roles });

    const result = await db.updateUserById(parseInt(id, 10), updateData);

    ctx.body = result;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

async function updateUserQuota(ctx) {
  const { id } = ctx.params;
  const { body: quota } = ctx.request;

  try {
    const result = await db.updateUserQuotaById(parseInt(id, 10), quota );

    ctx.body = result;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

async function deleteUser(ctx) {
  const { id: userID } = ctx.user;
  const { id } = ctx.params;

  if (userID === parseInt(id, 10)) {
    const e = new Error();
    e.status = 403;
    ctx.throw(e);
  }

  try {
    await db.removeUserById(parseInt(id, 10));
    ctx.body = null;
    ctx.status = 204;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

function omitUndefines(data) {
  return Object.entries(data)
    .filter(([, value]) => typeof value !== 'undefined')
    .reduce((acc, [k,v]) => (acc[k] = v, acc), {});
}
