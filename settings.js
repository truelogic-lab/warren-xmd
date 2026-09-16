import dotenv from 'dotenv';
dotenv.config();

export default {
  botName: process.env.BOT_NAME || 'Warren-xmd',
  ownerName: process.env.OWNER_NAME || 'WARREN',
  ownerNumber: process.env.OWNER_NUMBER || '',
  version: process.env.BOT_VERSION || '1.0.0',

  prefix: process.env.BOT_PREFIX || '.',
  mode: (process.env.BOT_MODE || 'public').toLowerCase(),
  timezone: process.env.TIMEZONE || 'Africa/Nairobi',

  maxSessions: parseInt(process.env.MAX_SESSIONS) || 100,
  reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL) || 5000,
  maxReconnectRetries: parseInt(process.env.MAX_RECONNECT_RETRIES) || 10,

  defaults: {
    antiLink: false, antiBot: false, antiSpam: false, antiDelete: false,
    antiCall: false, antiEdit: false, welcome: false, goodbye: false,
    autoRead: false, autoTyping: false, autoReact: false,
    autoStatusView: false, autoStatusSave: false, autoDownload: false,
  },

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
