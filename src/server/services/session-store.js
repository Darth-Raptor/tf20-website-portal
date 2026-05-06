import session from "express-session";

import { getDb, isDbConfigured } from "../db.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toStoredSession(sessionData) {
  return JSON.parse(JSON.stringify(sessionData));
}

function fromStoredSession(sessionData) {
  if (sessionData?.cookie?.expires) {
    sessionData.cookie.expires = new Date(sessionData.cookie.expires);
  }
  return sessionData;
}

function getExpiration(sessionData) {
  const cookieExpiration = sessionData?.cookie?.expires;
  if (cookieExpiration) {
    return new Date(cookieExpiration);
  }
  return new Date(Date.now() + ONE_DAY_MS);
}

export class PrismaSessionStore extends session.Store {
  get(sid, callback) {
    getDb()
      .session.findUnique({ where: { sid } })
      .then((record) => {
        if (!record || record.expiresAt <= new Date()) {
          callback(null, null);
          return;
        }
        callback(null, fromStoredSession(record.data));
      })
      .catch((error) => callback(error));
  }

  set(sid, sessionData, callback) {
    getDb()
      .session.upsert({
        where: { sid },
        update: {
          data: toStoredSession(sessionData),
          expiresAt: getExpiration(sessionData),
        },
        create: {
          sid,
          data: toStoredSession(sessionData),
          expiresAt: getExpiration(sessionData),
        },
      })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sid, sessionData, callback) {
    getDb()
      .session.update({
        where: { sid },
        data: {
          expiresAt: getExpiration(sessionData),
        },
      })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sid, callback) {
    getDb()
      .session.delete({ where: { sid } })
      .then(() => callback(null))
      .catch((error) => {
        if (error.code === "P2025") {
          callback(null);
          return;
        }
        callback(error);
      });
  }

  clearExpired() {
    return getDb().session.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
  }
}

export function createSessionStore() {
  if (!isDbConfigured()) {
    return undefined;
  }
  const store = new PrismaSessionStore();
  store.clearExpired().catch((error) => {
    console.error("Failed to clear expired sessions.", error);
  });
  return store;
}
