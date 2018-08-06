// Refers to article on working with datetime with timezone in Postgre
// https://60devs.com/working-with-postgresql-timestamp-without-timezone-in-node.html
import { setTypeParser } from 'pg-types';
import Sequelize from 'sequelize';

const TIMESTAMP_OID = 1114;
setTypeParser(TIMESTAMP_OID, (timestamp) => timestamp);

const DATABASE_URL  = process.env.DATABASE_URL;

const sequelize = new Sequelize(DATABASE_URL);

export async function initDb() {
  await sequelize.authenticate();
  await User.sync();
  await Resource.sync();
  await Quota.sync();

  return true;
}

export const User = sequelize.define('user', {
  email: Sequelize.STRING,
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  roles: Sequelize.ARRAY(Sequelize.STRING(16))
}, {
  indexes: [
    // Create a unique index on email
    {
      unique: true,
      fields: ['username']
    },
    // Create a unique index on email
    {
      unique: true,
      fields: ['email']
    }
  ]
});

export const Quota = sequelize.define('quota', {
  limit: Sequelize.INTEGER,
  unit: Sequelize.STRING(15)
});

export const Resource = sequelize.define('resource', {
  id: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
  },
  name: Sequelize.STRING
});

Resource.belongsTo(User, { as: 'owner' });
Quota.belongsTo(User, { as: 'user' });
User.hasOne(Quota);
