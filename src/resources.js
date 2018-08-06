import debug from 'debug';

import Router from 'koa-router';
import { protect } from './auth';
import * as db from './db';

const dbg = debug('simple-riqum:users');

export default function (app, baseUrl) {
  dbg(`Mounting resources handlers at ${baseUrl}`);

  const router = new Router({
    prefix: baseUrl
  });

  const ownerOnlyRules = {
    allowed: ['admin', 'owner']
  };

  router.get('/resources', protect(ownerOnlyRules), findResources);
  router.post('/resources', protect(ownerOnlyRules), createResource);

  router.get('/resources/:id', protect(ownerOnlyRules), getResource);
  router.put('/resources/:id', protect(ownerOnlyRules), updateResource);
  router.delete('/resources/:id', protect(ownerOnlyRules), deleteResource);

  app.use(router.routes());
  app.use(router.allowedMethods());
}

async function findResources(ctx) {
  const { user: { id: userId, roles } } = ctx;
  const criteria = ctx.request.query.q || {};
  const { page = '1', size = '10' } = ctx.request.query;
  const options = {
    limit: parseInt(size, 10),
    offset: (parseInt(page, 10) - 1) * size
  };

  if (roles.includes('admin')) {
    const result = await db.findResources(criteria, options);
    ctx.body = result;
  } else {
    const result = await db.findResourcesByOwnerId(userId, options);
    ctx.body = result;
  }
}

async function getResource(ctx) {
  const { user: { id: userId, roles } } = ctx;
  const { id: resourceID } = ctx.params;

  try {
    if (roles.includes('admin')) {
      const resource = await db.findResourceById(resourceID);
      ctx.body = resource;
    } else {
      const resource = await db.findResourceById(resourceID, { ownerId: userId });
      ctx.body = resource;
    }
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}

async function createResource(ctx) {
  const { body: { name } } = ctx.request;
  const { user: { id: userId } } = ctx;

  const quota = await db.findQuotaByUserId(userId);
  if (quota && quota.usage >= quota.limit) {
    const error = new Error('Quota limit violation');
    error.status = 429;
    ctx.throw(error);
  }

  const result = await db.createResource({ name, ownerId: userId }, { quota });

  ctx.body = result;
  ctx.status = 201;
}

function updateResource(ctx, userId) {
  ctx.body = {
    ok: true
  };
}

async function deleteResource(ctx) {
  const { user: { id: userId, roles } } = ctx;
  const { id } = ctx.params;

  try {
    if (roles.includes('admin')) {
      await db.removeResourceById(id);
    } else {
      await db.removeResourceById(id, { ownerId: userId });
    }

    ctx.body = null;
    ctx.status = 204;
  } catch (e) {
    e.status = 404;
    ctx.throw(e);
  }
}
