const { Events } = require('discord.js');
const { db } = require('../db.js');

async function deletewebhookMessage(client, webhookId, webhookMessageId, guildId, channelId) {
	console.log('On delete ouuu');
	const guild = client.guilds.cache.get(guildId);
	const channel = await guild.channels.cache.get(channelId);
	if (channel === undefined) return;

	if (channel.parentId !== undefined) {
		const channel1 = await guild.channels.cache.get(channel.parentId);
		const webhooks1 = await channel1.fetchWebhooks();
		const webhook1 = webhooks1.first();
		webhook1.deleteMessage(webhookMessageId, channelId);
	} else {
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.first();
		webhook.deleteMessage(webhookMessageId);
	}
}

module.exports = {
	name: Events.MessageDelete,
	execute(message) {
		console.log('MessageDelete Event');

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