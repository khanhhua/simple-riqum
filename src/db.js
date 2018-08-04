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

/**
 * Create user
 *
 * @param username
 * @param email
 * @param password
 * @param roles
 * @returns {Promise<void>}
 */
export async function createUser({ username, email, password, roles=['user'] }) {
  dbg(`Creating new user with roles [${roles.join(', ')}]`);

  const user = await User.create({ username, email, password, roles: ['user'] });

  return user.dataValues;
}
