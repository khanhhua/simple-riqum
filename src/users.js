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

  router.get('/users', protect(adminOnlyRules), findUsers);
  router.post('/users', protect(adminOnlyRules), createUser);

  router.get('/users/:id', protect(adminOnlyRules), getUser);
  router.put('/users/:id', protect(adminOnlyRules), updateUser);
  router.delete('/users/:id', protect(adminOnlyRules), deleteUser);

  app.use(router.routes());
  app.use(router.allowedMethods());
}

function findUsers(ctx) {
  ctx.body = {
    ok: true
  };
}

function getUser(ctx, userId) {
  ctx.body = {
    ok: true
  };
}

function createUser(ctx) {
  const { body } = ctx.request;

  ctx.body = {
    id: 1,
    username: body.username,
    email: body.email
  };
  ctx.status = 201;
}

function updateUser(ctx, userId) {
  ctx.body = {
    ok: true
  };
}

function deleteUser(ctx) {
  ctx.body = {
    ok: true
  };
}
