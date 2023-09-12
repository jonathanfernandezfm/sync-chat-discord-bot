const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('server.db');

db.run('CREATE TABLE IF NOT EXISTS groupes (serverOwnerName TEXT,serverOwner TEXT,name TEXT,password TEXT);');
db.run('CREATE TABLE IF NOT EXISTS channel (serverID TEXT,groupName TEXT, channelTagId TEXT, ChannelId INTEGER);');
db.run('CREATE TABLE IF NOT EXISTS server (serverID TEXT,groupName TEXT);');
db.run('CREATE TABLE IF NOT EXISTS messages (MessageId TEXT, WebHookMessageId TEXT, WebHookId TEXT, GuildId TEXT, ChannelID TEXT);');
db.run('CREATE TABLE IF NOT EXISTS threads (createdThreadId TEXT,threadId TEXT, forumId TEXT);');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('group')
		.setDescription('Commande regroupant diverses fonctionnalités pour gérer la synchronisation des serveurs.')
		//.addStringOption(option =>
		//	option.setName('action')
		//		.setDescription("L'action à choisir: create, join, addchannel, leave, delete, info, edit, infochannels, list, listserver, lockchannel.")
		//		.setRequired(true)),
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Créeer un groupe.')
				.addStringOption(name => name.setName('name')
					.setDescription('Nom du groupe.')
					.setRequired(true))
				.addStringOption(pass => pass.setName('password')
					.setDescription('Mot de passe du groupe.')										
				))
		.addSubcommand(subcommand =>
			subcommand
				.setName('join')
				.setDescription('Rejoindre un groupe.')
				.addStringOption(name => name.setName('name')
					.setDescription('Nom du groupe.')
					.setRequired(true))
				.addStringOption(pass => pass.setName('password')
					.setDescription('Mot de passe du groupe.')										
				))
		.addSubcommand(subcommand =>
			subcommand
				.setName('addchannel')
				.setDescription('Ajoute un channel de synchronisé au groupe')
				.addStringOption(nameOrg => nameOrg.setName('name')
					.setDescription('Nom du groupe')
					.setRequired(true))
				.addChannelOption(chan => chan.setName('channel')
					.setDescription('Channel a synchronisé')
					.setRequired(true))									
				.addIntegerOption(id => id.setName('id')
					.setDescription('Id of the channel')
					.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('leave')
				.setDescription('Permet de quitter un group. Attention si vous êtes le créateur de ce groupe il sera supprimé.')
				.addStringOption(nameOrg => nameOrg.setName('name')
					.setDescription('Nom du groupe')
					.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Permet d\'éditer le mot de passe ou le nom d\'un groupe ')
				.addStringOption(nameOrg => nameOrg.setName('name')
					.setDescription('Nom du groupe')
					.setRequired(true))
				.addStringOption(nameOrg => nameOrg.setName('action')
					.setDescription('Choisir entre changer le mot de passe où le nom du groupe.')
					.setRequired(true)
					.addChoices(
						{ name: 'Mot de passe', value: 'mdp' },
						{ name: 'Nom du group', value: 'name' },
					))
				
				.addStringOption(nameOrg => nameOrg.setName('new')
					.setDescription('Nouveau nom/mot de passe du groupe')
					.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('info')
				.setDescription('Permet d\'avoir des informations sur les groupe/ un groupe en particulier.')
				.addStringOption(nameOrg => nameOrg.setName('name')
					.setDescription('Nom du groupe')
					.setRequired(false)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('Permet de lister les serveurs publiques.')),
				
						
	async execute(interaction, client) {
		let action = interaction.options._subcommand;
		let param = interaction.options._hoistedOptions;
		switch (action){
		case 'create':
			let name = param[0].value;
			let password;
			if (param[1] != undefined){
				password = param[1].value;
			}
			let userName = interaction.user.username;
			let serverName = interaction.member.guild.name;

			// Check pour voir si le groupe n'existe pas déja.
				

			let createGrp = 'SELECT * FROM groupes WHERE name LIKE \'%\' || ? || \'%\';';

			db.all(createGrp, [name], function(err, rows) {
				if (err) {
					console.error(err.message);
				} else {
					// Process the matched rows
					console.log(rows);
					if (rows[0] !== undefined){
						if (rows[0].name === name){
							interaction.reply('Un groupe existe déja sous ce nom.'); 
						}}else{
						let join = 'SELECT * FROM groupes WHERE name LIKE \'%\' || ? || \'%\';';

						db.all(join, [name], function(err, rows) {
							if (err) {
								console.error(err.message);
							} else {
								// Process the matched rows
								let joinGroup = 'INSERT INTO server (serverID, groupName) VALUES (?,?);';
								let id_of_server =interaction.member.guild.id;
								db.run(joinGroup, [String(id_of_server),name]);
								console.log(`PUT ${id_of_server}, ${name}`);

					
							}
						});
						interaction.reply(`Le groupe ${name} a bien été crée.`);
					}
				}
			});

			if (password!=undefined){
				let groupes = 'INSERT INTO groupes (serverOwnerName, serverOwner, name, password) VALUES (?,?,?,?);';
				db.run(groupes, [serverName,userName, name, password]);
				console.log(`PUT ${serverName}, ${userName}, ${name}, ${password}`);
			}else{
				let groupes = 'INSERT INTO groupes (serverOwnerName, serverOwner, name) VALUES (?,?,?);';
				db.run(groupes, [serverName,userName, name]);
				console.log(`PUT ${serverName}, ${userName}, ${name}`);
			}

			break;
		case 'join':
			let nameOfGroup = param[0].value;
			let passOfGroup = param[1]?.value; // Use optional chaining to handle undefined
				
			// Query to check if the server is already in a group
			let checkifAlready = 'SELECT * FROM server WHERE serverID = ? AND groupName = ?;';
			let id_of_server = interaction.member.guild.id;
				
			// First, check if the server is already in a group
			db.all(checkifAlready, [String(id_of_server), nameOfGroup], function(err, rows) {
				if (err) {
					console.error(err.message);
					return;
				}
				
				if (rows.length > 0) {
					interaction.reply('Vous faites déjà partie de ce groupe.');
					return;
				}
				
				// Proceed to check and join the group
				let join = 'SELECT * FROM groupes WHERE name = ?;';
				db.all(join, [nameOfGroup], function(err, rows) {
					if (err) {
						console.error(err.message);
						return;
					}
				
					if(rows[0] === undefined){
						return interaction.reply('Le groupe n\'existe pas ou alors le mot de passe n\'est pas bon.');
					}
				
					if (rows[0].password === null || rows[0].password === passOfGroup) {
						let joinGroup = 'INSERT INTO server (serverID, groupName) VALUES (?, ?);';
						db.run(joinGroup, [String(id_of_server), nameOfGroup], function(err) {
							if (err) {
								console.error(err.message);
								return;
							}
							console.log(`PUT ${id_of_server}, ${nameOfGroup}`);
							interaction.reply(`Vous avez rejoint le groupe ${nameOfGroup}`);
						});
					} else {
						interaction.reply('Le groupe n\'existe pas ou alors le mot de passe n\'est pas bon.');
					}
				});
			});
				
			break;
		case 'addchannel':
			let serverId = interaction.member.guild.id;
			let name_of_group = param[0].value;
			let channel = param[1].value;
			let idChan = param[2].value;
				
			const guildGet = client.guilds.cache.get(serverId);
			const channelGet = guildGet.channels.cache.get(channel);
			console.log(channelGet.constructor.name);
			if(channelGet.constructor.name !== 'TextChannel' && channelGet.constructor.name !== 'ForumChannel'){
				interaction.reply('Veuillez choisir un channel valide.');
				return;
			}

			let checkIfInChannel = 'SELECT * FROM channel WHERE channelTagId = ?;';
			let mia;
			// First, check if the server is already in a group
			db.all(checkIfInChannel, [channel], function(err, rows) {
				if (err) {
					console.error(err.message);
					return;
				}
				console.log(rows);
				if (rows.length > 0) {
					interaction.reply('Ce channel est déja synchronisé dans un groupe.');
					mia = 1;
					return;
				}
				if(mia!=undefined){
					return;
				}
	
				let occurences = 'SELECT * FROM server WHERE serverID LIKE \'%\' || ? || \'%\';';
	
				db.all(occurences, [serverId], function(err, rows) {
					if (err) {
						console.error(err.message);
					} else {
						// Process the matched rows
						console.log(rows);
						let success;
						rows.forEach(function(row){
	
							//row !== [] 
							if (row.groupName === name_of_group){
								let channelQuery = 'INSERT INTO channel (serverID, groupName, channelTagId,ChannelId) VALUES (?,?,?,?);';
								db.run(channelQuery, [String(serverId),name_of_group, channel, idChan]);
								interaction.reply(`Le channel ${idChan} a été ajouté.`);
								success = 1;
								return;
							}
						});
						if(success != 1){
							interaction.reply(`Vous ne faite pas partie du groupe ${name_of_group}.`);
						}
							
							
					}
						
				});
	
				// (serverID INTEGER,groupName TEXT, channelTagId TEXT, ChannelId INTEGER)
					
			});
				
				
				
			break;
		case 'leave':
			let server_name = interaction.member.guild.name;
			let nameOfGroup1 = param[0].value;
				
			// Query to check if the server is already in a group
			let checkifAlreadyIn = 'SELECT * FROM server WHERE serverID = ? AND groupName = ?;';
				
			// First, check if the server is already in a group
			db.all(checkifAlreadyIn, [String(interaction.member.guild.id), nameOfGroup1], function(err, rows) {
				if (err) {
					console.error(err.message);
					return;
				}
				
				if (rows.length > 0) {
						
					if(rows[0].serverOwnerName===server_name){
						const delete_groupe = 'DELETE FROM groupes WHERE name = ?;';

						db.run(delete_groupe, [nameOfGroup1], function(err) {
							if (err) {
								console.error('Error deleting entry:', err.message);
								return;
							}

							const delete_channel = 'DELETE FROM channel WHERE groupName = ?;';

							db.run(delete_channel, [nameOfGroup1], function(err) {
								if (err) {
									console.error('Error deleting entry:', err.message);
									return;
								}
								const delete_server = 'DELETE FROM channel WHERE groupName = ?;';

								db.run(delete_server, [nameOfGroup1], function(err) {
									if (err) {
										console.error('Error deleting entry:', err.message);
										return;}
								});
							});
						});
					}else{

						const deleteQuery = 'DELETE FROM groupes WHERE name = ? AND serverOwnerName = ?;';

						db.run(deleteQuery, [nameOfGroup1, server_name], function(err) {
							if (err) {
								console.error('Error deleting entry:', err.message);
								return;
							}
							const delete_channel1 = 'DELETE FROM channel WHERE groupName = ? AND serverID = ?;';

							db.run(delete_channel1, [nameOfGroup1, interaction.member.guild.id], function(err) {
								if (err) {
									console.error('Error deleting entry:', err.message);
									return;
								}
								const delete_server1 = 'DELETE FROM server WHERE serverID = ?;';
								db.run(delete_server1, [interaction.member.guild.id], function(err) {
									if (err) {
										console.error('Error deleting entry:', err.message);
										return;
									}
							
								});
							});
						
							interaction.reply(`Vous avez bien quitté le groupe ${nameOfGroup1}`);
						});
					}
				}else{
					interaction.reply('Vous n\'êtes pas dans ce groupe.');
				}
					
				
			});
			break;
		case 'edit':
			let nameSrv = interaction.member.guild.name;
			let nameGrp = param[0].value;
			let action = param[1].value;
			let newThing = param[2].value;

			const checkIfAdmin = 'SELECT * FROM groupes WHERE name = ?';

			db.all(checkIfAdmin, [nameGrp], function (err, rows) {
				if (err) {
					return console.error(err.message);
				}

				if(rows.length > 0){
					if(rows[0].serverOwnerName!==nameSrv){
						interaction.reply('Vous n\'avez pas les permissions nécessaires pour modifier ce groupe.');
						return;
					}
				}
				if(rows.length === 0){
					interaction.reply('Ce groupe n\'existe pas.');
					return;
				} 
				switch(action){
				case 'mdp':
					const changePwd = 'UPDATE groupes SET password = ? WHERE name = ?';
	
					db.run(changePwd, [newThing, nameGrp], function (err) {
						if (err) {
							return console.error(err.message);
						}
						interaction.reply('Le mot de passe du groupe a bien été modifié.');
					});
					break;
				case 'name':
					let checkIfExist = 'SELECT * FROM groupes WHERE name = ?;';

					db.all(checkIfExist, [newThing], function(err, rows) {
						if (err) {
							console.error(err.message);
						} else {
							// Process the matched rows
							console.log(rows);
							if (rows[0] !== undefined){
								if (rows[0].name === nameGrp){
									return interaction.reply('Un groupe existe déja sous ce nom.'); 
								}}
								

							const editNameGroupe = 'UPDATE groupes SET name = ? WHERE name = ?;';

							db.run(editNameGroupe, [newThing, nameGrp], function(err) {
								if (err) {
									console.error('Error deleting entry:', err.message);
									return;
								}
								const editChannelGroup = 'UPDATE channel set groupName = ? WHERE groupName = ?;';
		
								db.run(editChannelGroup, [newThing, nameGrp], function(err) {
									if (err) {
										console.error('Error deleting entry:', err.message);
										return;
									}
									const EditServerGroup = 'UPDATE server set groupName = ? WHERE groupName = ?;';
									db.run(EditServerGroup, [newThing, nameGrp], function(err) {
										if (err) {
											console.error('Error deleting entry:', err.message);
											return;
										}
										interaction.reply('Le nom du groupe a bien été modifié.');
									});
								});
								
							
							});}});
				}
			});

					
			break;
		case 'info':
			let namedugrp;
			if(param[0] !== undefined){
				namedugrp = param[0].value;
				let getGrpInfo = 'SELECT * FROM groupes WHERE name LIKE \'%\' || ? || \'%\';';

				db.all(getGrpInfo, [namedugrp], function(err, rows) {
					if (err) {
						console.error(err.message);
					} 
					if(rows[0] === undefined){
						return interaction.reply('Ce groupe n\'existe pas.');
					}
					let founderName = rows[0].serverOwner;
					let founderServerName = rows[0].serverOwnerName;
					let getServerInfo = 'SELECT * FROM server WHERE groupName LIKE \'%\' || ? || \'%\';';

					db.all(getServerInfo, [namedugrp], function(err, rows) {
						if (err) {
							console.error(err.message);
						} 
						console.log(rows);
						let nbrServerUsingGroup = rows.length;
						let getChannelInfo = 'SELECT * FROM server WHERE groupName LIKE \'%\' || ? || \'%\';';

						db.all(getChannelInfo, [namedugrp], function(err, rows) {
							if (err) {
								console.error(err.message);
							} 
							let nbrChannelUsingGroup = rows.length;
							const embedStatGrp = new EmbedBuilder()
								.setAuthor({
									name: 'Info',
								})
								.setTitle('Pêcheurs FR - Info')
								.setDescription(`****Info sur ****\n\n> Créateur du groupe: ${founderName}\n> Serveur de création: ${founderServerName}\n\n> Serveurs connectés: ${nbrServerUsingGroup}\n> Salons synchronisés: ${nbrChannelUsingGroup}`)
								.setColor('#00b0f4')
								.setTimestamp();
							interaction.reply({ embeds: [embedStatGrp] });
												
						});
					});
				});
			}else{
				let getGlobalGroupInfo = 'SELECT * FROM groupes WHERE 1=1;';

				db.all(getGlobalGroupInfo, [], function(err, rows) {
					if (err) {
						console.error(err.message);
					} 
					let nbrGlobalOfGroup = rows.length;
					let getGlobalServerInfo = 'SELECT * FROM server WHERE 1=1;';

					db.all(getGlobalServerInfo, [], function(err, rows) {
						if (err) {
							console.error(err.message);
						} 
						console.log(rows);
						let nbrGlobalServerUsingGroup = rows.length;
						let getGlobalChannelInfo = 'SELECT * FROM server WHERE 1=1;';

						db.all(getGlobalChannelInfo, [], function(err, rows) {
							if (err) {
								console.error(err.message);
							} 
							let nbrGlobalChannelUsingGroup = rows.length;
							const embedStatGrp = new EmbedBuilder()
								.setAuthor({
									name: 'Info',
								})
								.setTitle('Pêcheurs FR - Info')
								.setDescription(`****Info Globales ****\n\n> Nombre de groupes: ${nbrGlobalOfGroup}\n> Serveurs connectés: ${nbrGlobalServerUsingGroup}\n> Salons synchronisés: ${nbrGlobalChannelUsingGroup}`)
								.setColor('#00b0f4')
								.setTimestamp();
							interaction.reply({ embeds: [embedStatGrp] });
									
						});
					});
				});
			}
				

			break ;

		case 'list':
			let ListPublicGroup = 'SELECT * FROM groupes WHERE password=\'null\';';

			db.all(ListPublicGroup, [], function(err, rows) {
				if (err) {
					console.error(err.message);
				} 
				console.log(rows);



			});
			break;
		}
		
		return;
	},
};