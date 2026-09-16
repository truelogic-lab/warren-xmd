/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

import fs from 'fs-extra';
import dotenv from 'dotenv';
dotenv.config();

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default {
  // ---------- Core identity ----------
  botName: process.env.BOT_NAME || 'Warren-xmd',
  ownerName: process.env.OWNER_NAME || 'Warren',
  ownerNumber: process.env.OWNER_NUMBER || '',
  version: process.env.BOT_VERSION || pkg.version || '1.0.0',
  author: 'Warren Musungu',
  github: 'https://github.com/truelogic-lab/warren-xmd',
  website: 'https://warren-xmd.vercel.app',

  // ---------- Behavior ----------
  prefix: process.env.BOT_PREFIX || '.',
  mode: (process.env.BOT_MODE || 'public').toLowerCase(),
  timezone: process.env.TIMEZONE || 'Africa/Nairobi',

  // ---------- Session management ----------
  maxSessions: parseInt(process.env.MAX_SESSIONS) || 1500,
  reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL) || 5000,
  maxReconnectRetries: parseInt(process.env.MAX_RECONNECT_RETRIES) || 10,

  // ---------- Sticker metadata ----------
  sticker: {
    packName: process.env.STICKER_PACK_NAME || 'Warren-XMD',
    author: process.env.STICKER_AUTHOR_NAME || 'Warren',
  },

  // ---------- Branding ----------
  watermark: process.env.WATERMARK || '> ©Warren-XMD',
  plink: process.env.PLINK || 'https://warren-xmd.vercel.app',

  // ---------- Sudo users ----------
  sudo: (process.env.SUDO || '').split(',').map(s => s.trim()).filter(Boolean),

  // ---------- Group defaults ----------
  defaults: {
    antiLink: false,
    antiBot: false,
    antiSpam: false,
    antiDelete: false,
    antiCall: false,
    antiEdit: false,
    welcome: false,
    goodbye: false,
    autoRead: false,
    autoTyping: false,
    autoReact: false,
    autoStatusView: false,
    autoStatusSave: false,
    autoDownload: false,
  },

  // ---------- Standard replies ----------
  mess: {
    done: '*✅ Done*',
    success: '©Warren-XMD',
    owner: "*You don't have permission to use this command!*",
    group: '*This feature becomes available when you use it in a group!*',
    admin: '*This feature requires admin privileges!*',
    notadmin: '*You need to be an admin to use this.*',
    wait: '⏳ Please wait...',
    error: '❌ An error occurred.',
  },

  // ---------- Legacy aliases (kept for existing plugins) ----------
  messages: {
    wait: '⏳ Please wait...',
    error: '❌ An error occurred.',
    ownerOnly: '❌ Owner only command.',
    adminOnly: '❌ Admin only command.',
    groupOnly: '❌ This command is for groups only.',
    privateOnly: '❌ This command is for private chat only.',
    success: '✅ Success.',
    notFound: '❌ Not found.',
  },
};
