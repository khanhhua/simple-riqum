import fs from 'fs';

import Router from 'koa-router';
import jwt from 'jsonwebtoken';

import * as db from './db';

let privkey;

export default function (app, baseUrl) {
  privkey = fs.readFileSync(process.env.JWT_PRIVATE_KEY);

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
      const accessToken = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: user.username
      }, privkey);

      ctx.body = {
        accessToken,
      };
    }
  } catch (e) {
    e.status = 403;
    ctx.throw(e);
  }
}
