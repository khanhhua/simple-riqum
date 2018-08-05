import chai, { expect } from 'chai';
import spies from 'chai-spies';
import * as auth from './auth';

chai.use(spies);

describe('auth module', () => {
  describe('Public interface', () => {
    it('must expose well defined functions', () => {
      expect(auth.default, 'Default function must be defined').to.be.a('function');
      expect(auth.identify, 'Function "identify" must be defined').to.be.a('function');
      expect(auth.protect, 'Function "protect" must be defined').to.be.a('function');
    });
  });

  describe('default function', () => {

  });

  describe('identify function', () => {

  });

  describe('protect function', () => {
    it('must return a promise returning function', () => {
      const actual = auth.protect();
      expect(actual).to.be.a('function');

      const result = actual();
      expect(result).to.be.a('promise');
    });

    describe('Resource protection rules', () => {
      it('must correctly handle anonymous user', async () => {
        let ctx = chai.spy.interface({
          'throw': function () {
            throw new Error('mock');
          }
        });
        let next = chai.spy();

        try {
          await auth.protect()(ctx, next);
        } catch (e) {
          expect(e).to.be.an('error');
          expect(ctx.throw).to.have.been.called.once;
        }
      });

      xit('must correctly handle rules.disallowed = "*"', async () => {
        ctx.user = {
          roles: ['user']
        };
        try {
          await auth.protect({ disallowed: '*' })(ctx, next);
        } catch (e) {
          expect(e).to.be.an('error');
          expect(ctx.throw).to.have.been.called.once;
        }
      });

      xit('must correctly handle rules.disallowed = ["admin"]', async () => {
        ctx.user = {
          roles: ['admin']
        };

        try {
          await auth.protect({ disallowed: ['admin'] })(ctx, next);
        } catch (e) {
          expect(e).to.be.an('error');
          expect(ctx.throw).to.have.been.called.once;
        }
      });

      xit('must correctly handle rules.disallowed = ["user"]', async () => {
        ctx.user = {
          roles: ['user']
        };

        try {
          await auth.protect({ disallowed: ['user'] })(ctx, next);
        } catch (e) {
          expect(e).to.be.an('error');
          expect(ctx.throw).to.have.been.called.once;
        }
      });

      xit('must correctly handle rules.disallowed = ["admin", "user"]', async () => {
        ctx.user = {
          roles: ['admin', 'user']
        };

        try {
          await auth.protect({ disallowed: ['admin', 'user'] })(ctx, next);
        } catch (e) {
          expect(e).to.be.an('error');
          expect(ctx.throw).to.have.been.called.once;
        }
      });

      describe('for user with roles = ["admin"]', () => {
        let ctx;
        let next;

        beforeEach(() => {
          ctx = chai.spy.interface({
            'throw': function () {
              throw new Error('mock');
            }
          });
          ctx.user = {
            roles: ['admin'],
            scopes: [
              '/api/v1/pseudo-path-for-testing-purpose-only'
            ]
          };
          ctx.request = {
            path: '/api/v1/pseudo-path-for-testing-purpose-only'
          };
          next = chai.spy();
        });

        it('must be allowed with rules.allowed = "*"', async () => {
          await auth.protect({ allowed: '*' })(ctx, next);
          expect(next).to.have.been.called;
        });

        it('must be allowed with rules.allowed = ["admin"]', async () => {
          await auth.protect({ allowed: ['admin'] })(ctx, next);
          expect(next).to.have.been.called.once;
        });

        it('must be allowed with rules.allowed = ["owner"]', async () => {
          await auth.protect({ allowed: ['owner'] })(ctx, next);
          expect(next).to.have.been.called.once;
        });

        it('must be rejected rules.allowed = ["user"]', async () => {
          try {
            await auth.protect({ allowed: [ 'user' ] })(ctx, next);
          } catch (e) {
            expect(e).to.be.an('error');
            expect(ctx.throw).to.have.been.called.once;
          }
        });

        it('must be allowed with rules.allowed = ["admin", "user"]', async () => {
          await auth.protect({ allowed: ['admin', 'user'] })(ctx, next);
          expect(next).to.have.been.called.once;
        });
      });

      describe('for user with roles = ["user"]', () => {
        let ctx;
        let next;

        beforeEach(() => {
          ctx = chai.spy.interface({
            'throw': function () {
              throw new Error('mock');
            }
          });
          ctx.user = {
            roles: ['user']
          };
          ctx.request = {
            path: '/api/v1/pseudo-path-for-testing-purpose-only'
          };
          next = chai.spy();
        });

        it('must be allowed with rules.allowed = "*"', async () => {
          await auth.protect({ allowed: '*' })(ctx, next);
          expect(next).to.have.been.called;
        });

        it('must be denied with rules.allowed = ["admin"]', async () => {
          try {
            await auth.protect({ allowed: ['admin'] })(ctx, next);
          } catch (e) {
            expect(e).to.be.an('error');
            expect(ctx.throw).to.have.been.called.once;
          }

        });

        it('must be allowed with rules.allowed = ["user"]', async () => {
          await auth.protect({ allowed: [ 'user' ] })(ctx, next);
          expect(next).to.have.been.called.once;
        });

        it('must be allowed with rules.allowed = ["admin", "user"]', async () => {
          await auth.protect({ allowed: ['admin', 'user'] })(ctx, next);
          expect(next).to.have.been.called.once;
        });
      });

      describe('for user to access his own resource, and rules.allowed=["owner"]', () => {
        let ctx;
        let next;

        beforeEach(() => {
          ctx = chai.spy.interface({
            'throw': function () {
              throw new Error('mock');
            }
          });

          next = chai.spy();
        });

        it('must be allowed if he owns the resource "/api/v1/users/10"', async () => {
          ctx.user = {
            id: 10,
            username: 'joe',
            roles: ['user'],
            scopes: [
              '/api/v1/users/10'
            ]
          };
          ctx.request = {
            path: '/api/v1/users/10'
          };

          await auth.protect({ allowed: ['owner'] })(ctx, next);
          expect(next).to.have.been.called.once;
        });

        it('must be rejected if he does not own the resource "/api/v1/users/10"', async () => {
          ctx.user = {
            id: 10,
            username: 'joe',
            roles: ['user'],
            scopes: [
              '/api/v1/users/1'
            ]
          };
          ctx.request = {
            path: '/api/v1/users/10'
          };

          try {
            await auth.protect({ allowed: ['owner'] })(ctx, next);
          } catch (e) {
            expect(e).to.be.an('error');
            expect(ctx.throw).to.have.been.called.once;
          }

        });
      });
    })
  });
});
