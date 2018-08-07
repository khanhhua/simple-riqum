import debug from 'debug';
import {initDb as modelsInitDb, transaction as sqlTransaction, User, Resource, Quota} from './models';

const dbg = debug('simple-riqum:db');

export async function initDb() {
  dbg('Ensuring database schema is ready...');

  await modelsInitDb();

  console.log('Initializing system initial data..');
  await User.findOrCreate(
    {
      where: {username: 'admin'},
      defaults: {
        username: 'admin',
        email: 'admin@localhost',
        roles: ['admin', 'user'],
        password: 'password'
      }
    });
  console.log('- Added admin user')

  return true;
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

export async function findUserById(id) {
  dbg('Finding user by user id...');
  const user = await User.findOne({
    include: [
      { model: Quota }
    ],
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

/**
 * Update an existing user
 *
 * @param id
 * @param updateData
 * @returns {Promise<{}|*>}
 */
export async function updateUserById(id, updateData) {
  const user = await User.findById(id);

  const { roles, email, password } = {... user.dataValues, ...updateData};
  await user.update({ roles, email, password });

  return user.dataValues;
}

export async function updateUserQuotaById(id, { limit, unit }) {
  const quota = await Quota.findOne({
    where: { userId: id }
  });

  let updatedQuota;
  if (quota) {
    updatedQuota = await quota.update({ limit, unit });
  } else {
    updatedQuota = await Quota.create({ limit, unit, userId: id });
  }

  return updatedQuota;
}

export async function removeUserById(id) {
  dbg('Removing user by user id...');
  const user = await User.findById(id);

  if (!user) {
    throw new Error('Not found');
  }

  await user.destroy();

  return true;
}

/**
 *
 * @param userId
 * @returns {Promise<Quota>} Quota can be null, which means there's no limit for this user
 */
export async function findQuotaByUserId(userId) {
  const quota = await Quota.findOne({
    raw: true,
    where: { userId }
  });

  return quota;
}

export async function findResourcesByOwnerId(ownerId, { limit = 10, offset = 0 } = {}) {
  dbg(`Finding resources by user id: ${ownerId}`);

  const resources = await Resource.findAll({
    raw: true,
    limit,
    offset,
    where: { ownerId }
  });

  dbg(`Resources found:`, resources.length);

  return resources.map(isolify);
}

export async function findResources(criteria, { limit = 10, offset = 0 } = {}) {
  dbg(`Finding resources by criteria: ${criteria}`);

  const resources = await Resource.findAll({
    raw: true,
    limit,
    offset,
    where: criteria
  });

  dbg(`Resources found:`, resources.length);

  return resources.map(isolify);
}

export async function findResourceById(resourceID, { ownerId = undefined } = {}) {
  dbg(`Finding one resource by id: ${resourceID}`);

  const resource = await Resource.findOne({
    raw: true,
    where: ownerId ? { ownerId, id: resourceID }: { id: resourceID }
  });

  if (!resource) {
    throw new Error('Not found');
  }

  return isolify(resource);
}

export async function createResource({ name, ownerId }, { quota = null } = {}) {
  dbg(`Creating new resource with for owner=${ownerId}`);

  if (quota && quota.unit === 'item') {
    dbg('Starting transaction...');

    const resource = await Resource.create({ name, ownerId });
    const currentUsage = quota.usage;
    const usage = currentUsage + 1;
    dbg(`Updating quota usage for owner=${ownerId}, old usage=${currentUsage}, new usage=${usage}`);
    await Quota.update({ usage }, { where: { userId: ownerId }});

    // TODO Apply transaction
    // const resource = await sqlTransaction(async tx => {
    //   const resource = await Resource.create({ name, ownerId });
    //   const currentUsage = quota.usage;
    //   const usage = quota.usage + 1;
    //
    //   dbg(`Updating quota usage for owner=${ownerId}, old usage=${currentUsage}, new usage=${usage}`);
    //   await Quota.update({ usage }, { where: { userId: ownerId }});
    //   await tx.commit();
    //   dbg('Transaction committed');
    //
    //   return resource;
    // });

    return resource.dataValues;
  } else {
    const resource = await Resource.create({ name, ownerId });

    return resource.dataValues;
  }
}

export async function removeResourceById(resourceId, { ownerId = undefined } = {}) {
  dbg(`Removing one resource by id: ${resourceId}`);

  const resource = await Resource.findOne({
    where: ownerId ? { ownerId, id: resourceId }: { id: resourceId }
  });

  if (!resource) {
    throw new Error('Not found');
  }

  await resource.destroy();

  const quota = await Quota.findOne({
    raw: true,
    where: {
      userId: ownerId
    }
  });
  if (quota && quota.usage > 1) {
    const currentUsage = quota.usage;
    const usage = currentUsage - 1;
    dbg(`Updating quota usage for owner=${ownerId}, old usage=${currentUsage}, new usage=${usage}`);
    await Quota.update({ usage }, { where: { userId: ownerId }});
  }
  return true;
}

function isolify(item) {
  if (item.createdAt) {
    item.createdAt = item.createdAt.toISOString();
  }

  if (item.updatedAt) {
    item.updatedAt = item.updatedAt.toISOString();
  }

  return item;
}
