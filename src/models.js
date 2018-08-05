import Sequelize from 'sequelize';

const DATABASE_URL  = process.env.DATABASE_URL;

const sequelize = new Sequelize(DATABASE_URL);

export async function initDb() {
  await sequelize.authenticate();
  await User.sync();
  await Resource.sync();

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

export const Resource = sequelize.define('resource', {
  id: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
  },
  name: Sequelize.STRING
});

Resource.belongsTo(User, { as: 'owner' });
