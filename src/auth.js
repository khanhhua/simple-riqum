import Router from 'koa-router';

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


  ctx.body = {
    accessToken: 'justaplaintoken',
  };
}