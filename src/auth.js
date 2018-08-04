import debug from 'debug';

import fs from 'fs';

import Router from 'koa-router';
import jwt from 'jsonwebtoken';

import * as db from './db';

const dbg = debug('simple-riqum:auth');

let privkey;
let passphrase;

export default function (app, baseUrl) {
  privkey = fs.readFileSync(process.env.JWT_PRIVATE_KEY);
  passphrase = process.env.JWT_PASS;

  const router = new Router({
    prefix: baseUrl
  });

  router.post('/login', login);

  router.post('/logout', async (ctx) => {
    ctx.body = {
      code: 200,
      type: 'ok',
      message: 'Session has been closed'
    };
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
}

export function identify(baseUrl) {
  let pubkey = fs.readFileSync(process.env.JWT_PUBLIC_KEY);

  return async function (ctx, next) {
    if (ctx.request.path.indexOf(baseUrl) !== 0) {
      await next();
      return;
    }

    const authorization = ctx.request.header['authorization'];
    if (!authorization) {
      dbg('Missing authorization header');
      ctx.throw('Forbidden', 403);
      return;
    }
    const [, accessToken] = authorization.split('Bearer ');
    if (!accessToken) {
      dbg('Missing authorization header');
      ctx.throw('Forbidden', 403);
      return;
    }
    try {
      const decrypted = jwt.verify(accessToken, pubkey, { algorithms: ['RS512'] });

      if (!decrypted) {
        dbg('Invalid authorization access token');
        ctx.throw('Forbidden', 403);
        return;
      } else if (decrypted.exp < Date.now()/1000) {
        dbg('Access token has expired');
        ctx.throw('Forbidden', 403);

        return;
      } else {
        ctx.user = {
          username: decrypted.sub,
          roles: decrypted.roles
        };
      }

      await next();
    } catch (e) {
      ctx.throw(e);
    }
  };
}

/**
 * Scope checking also, which requires function signature to become "protect(app, baseUrl, rules)"
 * rules.allowed and rules.disallowed take in scopes syntax: role ["owner", "admin"]
 *
 * @param rules {object}
 *  {
 *    allowed: '*'|roles::{[string]}|callback::{function}
 *    disallowed: '*'|roles::{[string]}|callback::{function}
 *  }
 *
 * @example
 * rules.allowed = '*'
 * rules.allowed = ['admin']
 * rules.allowed = ['admin', 'user']
 * rules.allowed = ['admin', 'owner']
 *
 * Rule callback function :: fn(ctx):Promise<boolean>
 */
export function protect(rules = {
  allowed: '*',
  // disallowed: '' TODO Nice to have. But not in the scope of this exercise
}) {
  // Normalize rules
  rules = Object.assign({}, {
    allowed: '*',
    disallowed: ''
  }, rules);

  return async function (ctx, next) {
    if (!ctx.user) {
      dbg('Public access forbidden');
      ctx.throw('Forbidden', 403);
    }

    // TODO Implement disallowed option
    // Let's do the restrictive mode: "disallowed" takes precedence over "allowed"
    // if (rules.disallowed) {
    //   ctx.throw('Forbidden', 403, {
    //     reason: 'Resource not allowed'
    //   });
    // }

    if (rules.allowed === '*') {
      await next();
      return;
    }
    // If a user has any of the defined roles, allow resource access
    const userRoles = ctx.user.roles;
    const { allowed: allowedRules } = rules;

    if (Array.isArray(allowedRules)) {
      for (let role of allowedRules) {
        if (userRoles.includes(role)) {
          return await next();
        }
      }

      dbg('User does not have the required role(s):', allowedRules);
      ctx.throw('Forbidden', 403, {
        reason: 'Resource not allowed'
      });
    } else if (typeof allowedRules === 'function') {
      if (await allowedRules(ctx) === true) {
        return next();
      } else {
        dbg('Rule callback function has rejected user access');
        ctx.throw('Forbidden', 403, {
          reason: 'Resource not allowed'
        });
      }
    }

    await next();
  }
}

async function login (ctx) {
  const { email, password } = ctx.request.body;
  dbg(`Logging in using email ${email}...`);

  try {
    const user = await db.findUserByCredential(email, password);

    if (user) {
      const accessToken = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: user.username
      }, {
        key: privkey,
        passphrase: passphrase
      }, {
        algorithm: 'RS512'
      });

      ctx.body = {
        accessToken,
      };
    }
  } catch (e) {
    e.status = 403;
    ctx.throw(e);
  }
}
