import Router from 'koa-router';

import * as db from './db';

export default function (app, baseUrl) {
  const router = new Router({
    prefix: baseUrl
  });

  router.post('/login', login);

  router.post('/logout', async (ctx) => {
    ctx.body = {
      code: 200,
      type: 'ok',
      message: 'Session has been closed'
    };
  });

  app.use(router.routes());
}

async function login (ctx) {
  const { email, password } = ctx.request.body;

  try {
    const user = await db.findUserByCredential(email, password);

    if (user) {
      ctx.body = {
        accessToken: 'justaplaintoken',
      };
    }
  } catch (e) {
    e.status = 403;
    ctx.throw(e);
  }
}