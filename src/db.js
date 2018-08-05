import debug from 'debug';
import { initDb as modelsInitDb, User, Resource } from './models';

const dbg = debug('simple-riqum:db');

export async function initDb() {
  dbg('Ensuring database schema is ready...');

  return await modelsInitDb();
}

export async function findUserById(id) {
  dbg('Finding user by user id...');
  const user = await User.findOne({
    attributes: { exclude: ['password'] },
    where: { id }
  });

  if (!user) {
    throw new Error('Not found');
  }

  dbg('User value:', user.dataValues);
  return user.dataValues;
}

export async function findUserByUsername(username) {
  dbg('Finding user by username...');
  const user = await User.findOne({
    attributes: { exclude: ['password'] },
    where: { username }
  });
  if (!user) {
    throw new Error('Not found');
  }

  dbg('User value:', user.dataValues);
  return user.dataValues;
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

/**
 *
 * @param criteria
 * @param limit
 * @param offset
 * @returns {Promise<*>}
 */
export async function findUsers(criteria = {}, { limit = 10, offset = 0 }) {
  dbg('Retrieving users by the given criteria', criteria);

  const query = await User.findAll({
    offset,
    limit,
    attributes: { exclude: ['password'] },
    where: criteria
  });

  return query.map(it => it.dataValues);
}

export async function removeUserById(id) {
  dbg('Removing user by user id...');
  const user = await User.removeById({
    attributes: { exclude: ['password'] },
    where: { id }
  });

  if (!user) {
    throw new Error('Not found');
  }

  dbg('User value:', user.dataValues);
  return user.dataValues;
}

export async function findResourcesByOwnerId(ownerId, { limit = 10, offset = 0 } = {}) {
  dbg(`Finding resources by user id: ${ownerId}`);

  const query = await Resource.findAll({
    raw: true,
    limit,
    offset,
    where: { ownerId }
  });

  dbg(`Resources found:`, query.length);

  return query.map(it => ({...it, createdAt: it.createdAt.toISOString(), updatedAt: it.updatedAt.toISOString() }));
}

export async function findResources(criteria, options) {

}

export async function findResourceById(resourceId) {

}
