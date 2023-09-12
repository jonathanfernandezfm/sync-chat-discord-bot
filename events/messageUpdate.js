const { Events } = require('discord.js');
const { db } = require('../db.js');

async function EditwebhookMessage(webhookId, webhookMessageId, guildId, channelId, newContent, message) {
	const guild = message.client.guilds.cache.get(guildId);
	const channel = await guild.channels.cache.get(channelId);
	if (channel === undefined) return;
	if (channel.parentId !== undefined) {
		const channel1 = await guild.channels.cache.get(channel.parentId);
		const webhooks1 = await channel1.fetchWebhooks();
		const webhook1 = webhooks1.first();
		webhook1.editMessage(webhookMessageId, { content: newContent, threadId: channelId });
	} else {
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.first();
		webhook.editMessage(webhookMessageId, { content: newContent });
	}
}

module.exports = {
	name: Events.MessageUpdate,
	async execute(message) {
		console.log('MessageUpdate Event');
		let checkMess = 'SELECT * FROM messages WHERE MessageId LIKE \'%\' || ? || \'%\';';
		db.all(checkMess, [message.id], function (err, rows) {
			if (err) {
				console.error(err.message);
			} else {
			// Process the matched rows
				rows.forEach(function (row) {
					EditwebhookMessage(row.WebHookId, row.WebHookMessageId, row.GuildId, row.ChannelID, message.reactions.message.content, message);
				});
			}
		});
	},
};