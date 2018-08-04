import debug from 'debug';
import { initDb as modelsInitDb, User } from './models';

const dbg = debug('simple-riqum:db');

export async function initDb() {
  dbg('Ensuring database schema is ready...');

  return await modelsInitDb();
}

export async function findUserByCredential(email, password) {
  dbg('Finding user by credential...');
  // TODO: Hash the pass
  const user = await User.findOne({
    attributes: { exclude: ['password'] },
    where: { email, password }
  });
  dbg('User value:', user.dataValues);

  return user.dataValues;
}
