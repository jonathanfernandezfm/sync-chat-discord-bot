require('dotenv').config(); 
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('server.db');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const ongoingThreads = new Map(); // threadId => webhook


client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

async function sendMessageWebHook(guild_id, channel_id, message) {
	if (message.channel.id === channel_id) return;
	const guild = client.guilds.cache.get(guild_id);
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

async function sendMessageForumWebHook(guild_id, channel_id, message, name, thread) {
	const guild = client.guilds.cache.get(guild_id);
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

async function checkWebHook(serverId, channelId) {
	const guild = await client.guilds.cache.get(serverId);
	const channelweb = await guild.channels.cache.get(channelId);
	if (channelweb === undefined) return;
	const webhooks = await channelweb.fetchWebhooks();

	if (webhooks.size === 0) {
		channelweb.createWebhook({
			name: 'uwu',
			avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
		});
	}
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
				checkWebHook(row.serverID, row.channelTagId);
				sendMessageWebHook(row.serverID, row.channelTagId, message);
			});
		}
	});
}

async function deletewebhookMessage(webhookId, webhookMessageId, guildId, channelId) {
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

async function EditwebhookMessage(webhookId, webhookMessageId, guildId, channelId, newContent) {
	const guild = client.guilds.cache.get(guildId);
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

client.on(Events.MessageDelete, async (message) => {
	console.log('MessageDelete Event');

	let checkMess = 'SELECT * FROM messages WHERE MessageId LIKE \'%\' || ? || \'%\';';
	db.all(checkMess, [message.id], function (err, rows) {
		if (err) {
			console.error(err.message);
		} else {
			// Process the matched rows
			rows.forEach(function (row) {
				const guild = client.guilds.cache.get(message.guildId);
				const channel = guild.channels.cache.get(message.channelId);
				//if (!channel.isThread()){
				deletewebhookMessage(row.WebHookId, row.WebHookMessageId, row.GuildId, row.ChannelID);
				//}
			});
		}
	});
});

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

client.on(Events.MessageCreate, async (message) => {
	console.log('MessageCreate Event');

	if (message.author.bot === true) return;

	const guild = client.guilds.cache.get(message.guildId);
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
});

client.on(Events.MessageUpdate, async (message) => {
	console.log('MessageUpdate Event');
	let checkMess = 'SELECT * FROM messages WHERE MessageId LIKE \'%\' || ? || \'%\';';
	db.all(checkMess, [message.id], function (err, rows) {
		if (err) {
			console.error(err.message);
		} else {
			// Process the matched rows
			rows.forEach(function (row) {
				EditwebhookMessage(row.WebHookId, row.WebHookMessageId, row.GuildId, row.ChannelID, message.reactions.message.content);
			});
		}
	});
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(process.env.TOKEN);
