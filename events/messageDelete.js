const { Events, ChannelType } = require('discord.js');
const { db } = require('../db.js');
const logger = require('../utils/logger.js');

async function deletewebhookMessage(client, webhookId, webhookMessageId, guildId, channelId) {
	const guild = client.guilds.cache.get(guildId);
	const channel = await guild.channels.cache.get(channelId);
	if (channel === undefined) return;

	if (channel.parentId !== undefined) {
		const parentChannel = await guild.channels.cache.get(channel.parentId);
		if(parentChannel.type === ChannelType.PublicThread) {
			const webhooks1 = await parentChannel.fetchWebhooks();
			const webhook1 = webhooks1.first();
			webhook1.deleteMessage(webhookMessageId, channelId);
		} else {
			const webhooks = await channel.fetchWebhooks();
			const webhook = webhooks.first();
			webhook.deleteMessage(webhookMessageId);
		}
	} else {
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.first();
		webhook.deleteMessage(webhookMessageId);
	}
}

module.exports = {
	name: Events.MessageDelete,
	execute(message) {
		logger.info('MessageDelete Event');

		let checkMess = 'SELECT * FROM messages WHERE MessageId LIKE \'%\' || ? || \'%\';';
		db.all(checkMess, [message.id], function (err, rows) {
			if (err) {
				console.error(err.message);
			} else {
			// Process the matched rows
				rows.forEach(function (row) {
					const guild = message.client.guilds.cache.get(message.guildId);
					const channel = guild.channels.cache.get(message.channelId);
					//if (!channel.isThread()){
					deletewebhookMessage(message.client, row.WebHookId, row.WebHookMessageId, row.GuildId, row.ChannelID);
				//}
				});
			}
		});
	},
};