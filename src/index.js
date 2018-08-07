import debug from 'debug';
import Koa from 'koa';
import morgan from 'koa-morgan';
// Swagger documentation
import * as swagger from 'swagger2';
import { ui } from 'swagger2-koa';
import makeApp from './app';
import { initDb } from './db';
import { makeChannel } from './resource-deployer';

const PORT = process.env.PORT || '8080';

const document = swagger.loadDocumentSync('./swagger/api.yaml');

const app = makeApp();
app.use(ui(document, "/swagger"));
app.use(morgan('combined'));

const dbg = debug('simple-riqum');

Promise.all([
  initDb().then(() => { dbg('Database configuration done'); }),
  makeChannel().then(() => { dbg('AMQP configuration done'); })
]).then(() => {
  dbg('Initialization completed');

  app.listen(PORT, () => {
    dbg(`Node environment: ${process.env.NODE_ENV}`);
    dbg(`Listening on port ${PORT}...`);
  });
});
