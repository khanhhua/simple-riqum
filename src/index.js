import debug from 'debug';
import Koa from 'koa';
import morgan from 'koa-morgan';
// Swagger documentation
import * as swagger from 'swagger2';
import { ui } from 'swagger2-koa';

const app = new Koa();
const document = swagger.loadDocumentSync('./swagger/api.yml');

app.use(morgan('combined'));
app.use(ui(document, "/swagger"));

const PORT = process.env.PORT || '8080';

app.listen(PORT, () => {
  const dbg = debug('simple-riqum');

  dbg(`Listening on port ${PORT}...`);
});