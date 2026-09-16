import { pool } from '../../lib/database.js';
import { invalidateSettings } from './_helpers.js';

export default {
  name: "ResetSettings",
  triggers: ["resetsettings", "resetgc"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await pool.query(
        `UPDATE group_settings SET
          antilink = FALSE, antibot = FALSE, antispam = FALSE,
          antidelete = FALSE, anticall = FALSE, antitag = FALSE,
          welcome = FALSE, goodbye = FALSE,
          welcome_msg = NULL, goodbye_msg = NULL,
          mute = FALSE, locked = FALSE
        WHERE group_jid = $1`,
        [ctx.from]
      );
      invalidateSettings(ctx.from);
      await ctx.reply("✅ All group settings reset to default.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
