import debug from 'debug';

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import * as swagger from 'swagger2';
import { validate } from 'swagger2-koa';

import auth, { identify, protect } from './auth';
import users from './users';

export default function makeApp() {
  const dbg = debug('simple-riqum:app');

  const app = new Koa();
  const document = swagger.loadDocumentSync('./swagger/api.yaml');

  app.use(bodyParser());
  app.use(async (ctx, next) => {
    try {
      await next();

      if (ctx.body && ctx.body.code === 'SWAGGER_REQUEST_VALIDATION_FAILED') {
        const devError = ctx.body;
        dbg(devError);

        ctx.body = {
          code: 400,
          type: 'error',
          message: 'Bad Request',
          errors: ctx.body.errors.map(({error}) => error)
        };
      }
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = {
        code: err.status || 500,
        type: 'error',
        message: err.message || 'Bad Request'
      };

      ctx.app.emit('error', err, ctx);
    }
  });

  app.use(identify('/api'));
  app.use(validate(document));
  // Mounting modules as we go
  auth(app, '/api/v1/auth');
  users(app, '/api/v1');

  return app;
}
