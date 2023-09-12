const { Events } = require('discord.js');
const { db } = require('../db.js');
const logger = require('../utils/logger.js');

let globalResponse = [];

function checkIfChannelIsInSyncAndGetId(message) {
	// recupere id du sync via le channel du message
	let createGrp = 'SELECT * FROM channel WHERE channelTagId LIKE \'%\' || ? || \'%\';';
	db.all(createGrp, [message.channel.id], function (err, rows) {
		if (err) {
			console.error(err.message);
		} else {
			// Process the matched rows
			if (rows[0] != undefined) {
				globalResponse[0] = rows[0].groupName;
				globalResponse[1] = rows[0].ChannelId;
				checkEveryServer(globalResponse[1], globalResponse[0], message);
			}
		}
	});
}

function checkEveryServer(ChannelId, Group, message) {
	let getid = `SELECT * FROM channel WHERE groupName LIKE '%' || ? || '%' AND ChannelId
	LIKE '%' || ? || '%';`;
	db.all(getid, [Group, ChannelId], function (err, rows) {
		if (err) {
			console.error(err.message);
		} else {
			// Process the matched rows
			rows.forEach(function (row) {
				checkWebHook(row.serverID, row.channelTagId, message);
				sendMessageWebHook(row.serverID, row.channelTagId, message);
			});
		}
	});
}

async function sendMessageWebHook(guild_id, channel_id, message) {
	if (message.channel.id === channel_id) return;
	const guild = message.client.guilds.cache.get(guild_id);
	const channel = await guild.channels.cache.get(channel_id);

	try {
		const attachmentsToSend = [];

		message.attachments.forEach((attachment) => {
			attachmentsToSend.push({
				attachment: attachment.url,
				name: attachment.name,
			});
		});

		if (channel === undefined) return;
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.first();

		await webhook
			.send({
				content: message.content || undefined,
				username: message.author.username,
				avatarURL: 'https://cdn.discordapp.com/avatars/' + message.author.id + '/' + message.author.avatar + '.jpeg',
				files: attachmentsToSend || undefined,
			})
			.then((webhookMessage) => {
				let joinGroup = 'INSERT INTO messages (MessageId, WebHookMessageId, WebHookId, GuildId, ChannelID) VALUES (?,?,?,?,?);';
				db.run(joinGroup, [
					message.id,
					webhookMessage.id,
					webhookMessage.webhookId,
					webhookMessage.guildId,
					webhookMessage.channelId,
				]);
			});
	} catch (error) {
		console.error('Error trying to send: ', error);
	}
}

async function checkWebHook(serverId, channelId, message) {
	const guild = await message.client.guilds.cache.get(serverId);
	const channelweb = await guild.channels.cache.get(channelId);
	if (channelweb === undefined) return;
	const webhooks = await channelweb.fetchWebhooks();

	if (webhooks.size === 0) {
		channelweb.createWebhook({
			name: 'Sync Chat Webhook',
			avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
		});
	}
}

async function adaptThread(thread, servId, channelId, grpName) {
	const name = thread.name;
	const messages = await thread.messages.fetch({ limit: 1 });
	const [message] = messages.values();

	if (!messages && !messages.content) return;

	if (message.author.bot === true) return;

	let getForumId = `SELECT * FROM channel WHERE groupName LIKE '%' || ? || '%' AND ChannelId
	LIKE '%' || ? || '%';`;
	db.all(getForumId, [grpName, channelId], function (err, rows) {
		if (err) {
			console.error(err.message);
		} else {
			// Process the matched rows
			rows.forEach(function (row) {
				checkWebHook(row.serverID, row.channelTagId);
				if (thread.parentId === row.channelTagId) return;
				sendMessageForumWebHook(row.serverID, row.channelTagId, message, name, thread);
			});
		}
	});
}

async function sendMessageForumWebHook(guild_id, channel_id, message, name, thread) {
	const guild = message.client.guilds.cache.get(guild_id);
	const channel = await guild.channels.cache.get(channel_id);
	try {
		const attachmentsToSend = [];

		message.attachments.forEach((attachment) => {
			attachmentsToSend.push({
				attachment: attachment.url,
				name: attachment.name,
			});
		});

		if (channel === undefined) return;
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.first();

		let listThreadOuMaladieVeinuse = 'SELECT * FROM threads WHERE threadId = ? AND forumId = ?;';

		db.all(listThreadOuMaladieVeinuse, [thread.id, webhook.channelId], async function (err, rows) {
			if (err) {
				console.error(err.message);
			} else {
				if (rows.length === 0) {
					await webhook
						.send({
							content: message.content || undefined,
							username: message.author.username,
							avatarURL: 'https://cdn.discordapp.com/avatars/' + message.author.id + '/' + message.author.avatar + '.jpeg',
							files: attachmentsToSend || undefined,
							threadName: name,
							//threadId: thread.id || undefined
						})
						.then((webhookMessage) => {
							let defineThreadRem = 'INSERT INTO threads (createdThreadId,threadId, forumId) VALUES (?,?,?);';
							db.run(defineThreadRem, [webhookMessage.id, thread.id, webhook.channelId]);

							let insanityGodLevel = 'INSERT INTO threads (createdThreadId,threadId, forumId) VALUES (?,?,?);';
							db.run(insanityGodLevel, [thread.id, webhookMessage.id, thread.parentId]);

							let joinGroup =
								'INSERT INTO messages (MessageId, WebHookMessageId, WebHookId, GuildId, ChannelID) VALUES (?,?,?,?,?);';
							db.run(joinGroup, [
								message.id,
								webhookMessage.id,
								webhookMessage.webhookId,
								webhookMessage.guildId,
								webhookMessage.channelId,
							]);
						});
				} else {
					let getThreadID = 'SELECT * FROM threads WHERE threadId = ? AND forumId = ?;';

					db.all(getThreadID, [thread.id, webhook.channelId], function (err, rows) {
						if (err) {
							console.error(err.message);
						} else {
							if (rows[0] === undefined) return;
							webhook
								.send({
									content: message.content || undefined,
									username: message.author.username,
									avatarURL:
										'https://cdn.discordapp.com/avatars/' + message.author.id + '/' + message.author.avatar + '.jpeg',
									files: attachmentsToSend || undefined,
									threadId: rows[0].createdThreadId,
								})
								.then((webhookMessage) => {
									let joinGroup =
										'INSERT INTO messages (MessageId, WebHookMessageId, WebHookId, GuildId, ChannelID) VALUES (?,?,?,?,?);';
									db.run(joinGroup, [
										message.id,
										webhookMessage.id,
										webhookMessage.webhookId,
										webhookMessage.guildId,
										webhookMessage.channelId,
									]);
								});
						}
					});
				}
			}
		});
	} catch (error) {
		console.error('Error trying to send: ', error);
	}
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		logger.info('MessageCreate Event');

		if (message.author.bot === true) return;

		const guild = message.client.guilds.cache.get(message.guildId);
		const channel = guild.channels.cache.get(message.channelId);
		if (!channel.isThread()) {
			let response = checkIfChannelIsInSyncAndGetId(message);
		} else {
			const thread = await channel.fetch();
			let checkForumSyncedUpd = 'SELECT * FROM channel WHERE channelTagId LIKE \'%\' || ? || \'%\';';
			db.all(checkForumSyncedUpd, [thread.parentId], function (err, rows) {
				if (err) {
					console.error(err.message);
				} else {
					// Process the matched rows
					rows.forEach(function (row) {
						adaptThread(thread, row.serverID, row.ChannelId, row.groupName);
					});
				}
			});
		}
	},
};