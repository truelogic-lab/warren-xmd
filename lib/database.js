/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Fix #4 — Larger pool, shorter idle timeout
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fix #4 — Log pool errors instead of crashing the process
pool.on('error', (err) => {
  console.error('⚠️ Postgres pool error:', err.message);
});

export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected');

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_state (
        phone_number BIGINT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (phone_number, key)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_jid TEXT PRIMARY KEY,
        antilink BOOLEAN DEFAULT FALSE,
        antibot BOOLEAN DEFAULT FALSE,
        antispam BOOLEAN DEFAULT FALSE,
        antidelete BOOLEAN DEFAULT FALSE,
        anticall BOOLEAN DEFAULT FALSE,
        antitag BOOLEAN DEFAULT FALSE,
        welcome BOOLEAN DEFAULT FALSE,
        goodbye BOOLEAN DEFAULT FALSE,
        welcome_msg TEXT DEFAULT NULL,
        goodbye_msg TEXT DEFAULT NULL,
        mute BOOLEAN DEFAULT FALSE,
        locked BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS banned_users (
        user_number TEXT NOT NULL,
        group_jid TEXT NOT NULL DEFAULT 'global',
        reason TEXT DEFAULT NULL,
        banned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_number, group_jid)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS antiban_state (
        phone_number TEXT PRIMARY KEY,
        first_seen TIMESTAMP DEFAULT NOW(),
        warmup_day INT DEFAULT 0,
        daily_count INT DEFAULT 0,
        hourly_count INT DEFAULT 0,
        minute_count INT DEFAULT 0,
        total_sent INT DEFAULT 0,
        error_count INT DEFAULT 0,
        disconnect_count INT DEFAULT 0,
        inbound_count INT DEFAULT 0,
        outbound_count INT DEFAULT 0,
        circuit_broken_until TIMESTAMP,
        circuit_reason TEXT,
        welcomed BOOLEAN DEFAULT FALSE,
        last_sent TIMESTAMP,
        last_reset_day TEXT,
        last_hour_reset TIMESTAMP,
        last_minute_reset TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE antiban_state
        ADD COLUMN IF NOT EXISTS inbound_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS outbound_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS circuit_broken_until TIMESTAMP,
        ADD COLUMN IF NOT EXISTS circuit_reason TEXT,
        ADD COLUMN IF NOT EXISTS welcomed BOOLEAN DEFAULT FALSE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_proxies (
        phone_number TEXT PRIMARY KEY,
        country_code TEXT,
        proxy_url TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW()
      );
    `);

    client.release();
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    return false;
  }
}

export async function closeDatabase() {
  await pool.end();
  console.log('🔌 PostgreSQL pool closed');
}

// ============================================
// Group settings
// ============================================
export async function getGroupSettings(groupJid) {
  const { rows } = await pool.query(
    'SELECT * FROM group_settings WHERE group_jid = $1',
    [groupJid]
  );
  if (rows[0]) return rows[0];

  await pool.query(
    'INSERT INTO group_settings (group_jid) VALUES ($1) ON CONFLICT DO NOTHING',
    [groupJid]
  );
  const fresh = await pool.query(
    'SELECT * FROM group_settings WHERE group_jid = $1',
    [groupJid]
  );
  return fresh.rows[0];
}

export async function updateGroupSetting(groupJid, field, value) {
  const allowed = [
    'antilink','antibot','antispam','antidelete','anticall','antitag',
    'welcome','goodbye','welcome_msg','goodbye_msg','mute','locked'
  ];
  if (!allowed.includes(field)) throw new Error(`Invalid field: ${field}`);

  await pool.query(
    'INSERT INTO group_settings (group_jid) VALUES ($1) ON CONFLICT DO NOTHING',
    [groupJid]
  );
  await pool.query(
    `UPDATE group_settings SET ${field} = $1, updated_at = NOW() WHERE group_jid = $2`,
    [value, groupJid]
  );
}

// ============================================
// Bans
// ============================================
export async function isBanned(userNumber, groupJid = 'global') {
  const { rows } = await pool.query(
    `SELECT 1 FROM banned_users
     WHERE user_number = $1 AND (group_jid = $2 OR group_jid = 'global')`,
    [userNumber, groupJid]
  );
  return rows.length > 0;
}

export async function banUser(userNumber, groupJid = 'global', reason = null) {
  await pool.query(
    `INSERT INTO banned_users (user_number, group_jid, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userNumber, groupJid, reason]
  );
}

export async function unbanUser(userNumber, groupJid = 'global') {
  await pool.query(
    `DELETE FROM banned_users WHERE user_number = $1 AND group_jid = $2`,
    [userNumber, groupJid]
  );
}
