import debug from 'debug';
import Koa from 'koa';
import morgan from 'koa-morgan';
// Swagger documentation
import * as swagger from 'swagger2';
import { ui } from 'swagger2-koa';
import makeApp from './app';
import { initDb } from './db';

const PORT = process.env.PORT || '8080';

const document = swagger.loadDocumentSync('./swagger/api.yaml');

const app = makeApp();
app.use(ui(document, "/swagger"));
app.use(morgan('combined'));

const dbg = debug('simple-riqum');
initDb().then(() => {
  dbg('Initialization completed');

  app.listen(PORT, () => {
    dbg(`Listening on port ${PORT}...`);
  });
});
