export async function findUserByCredential(email, password) {
  return Promise.resolve({
    email,
    username: 'MockUSER',
    roles: ['admin']
  });
}