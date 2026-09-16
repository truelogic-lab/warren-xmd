/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

class Cache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs = 60000) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
  size() { return this.store.size; }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expires) this.store.delete(key);
      }
    }, 60000).unref();
  }
}

export const cache = new Cache();
cache.startCleanup();

export const TTL = {
  OWNERS: 30000,
  GROUP_META: 60000,
  ADMIN_LIST: 60000,
  SETTINGS: 120000,
};

export const KEYS = {
  owners: () => 'owners',
  groupMeta: (jid) => `gmeta:${jid}`,
  adminList: (jid) => `admins:${jid}`,
  userSettings: (jid) => `usettings:${jid}`,
};
