import Sequelize from 'sequelize';

const DATABASE_URL  = process.env.DATABASE_URL;

const sequelize = new Sequelize(DATABASE_URL);

export async function initDb() {
  await sequelize.authenticate();
  await User.sync();

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
      fields: ['email']
    }
  ]
});
