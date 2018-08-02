import supertest from 'supertest';

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import * as swagger from 'swagger2';
import { validate } from 'swagger2-koa';

function makeApp() {
  const app = new Koa();
  const document = swagger.loadDocumentSync('./swagger/api.yaml');
  app.use(bodyParser());
  app.use(validate(document));

  return app;
}

describe('As a platform user, I need to authenticate with an email address and password', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
  });

  it('must require email and password', (done) => {
    supertest(app.callback())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) throw err;

        console.log(res);
        done();
      })
  });
});