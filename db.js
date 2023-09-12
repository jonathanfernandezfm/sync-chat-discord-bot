var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('server.db');

module.exports = {
	db,
	initializeDB: () => {
		db.run('CREATE TABLE IF NOT EXISTS groupes (serverOwnerName TEXT,serverOwner TEXT,name TEXT,password TEXT);');
		db.run('CREATE TABLE IF NOT EXISTS channel (serverID TEXT,groupName TEXT, channelTagId TEXT, ChannelId INTEGER);');
		db.run('CREATE TABLE IF NOT EXISTS server (serverID TEXT,groupName TEXT);');
		db.run('CREATE TABLE IF NOT EXISTS messages (MessageId TEXT, WebHookMessageId TEXT, WebHookId TEXT, GuildId TEXT, ChannelID TEXT);');
		db.run('CREATE TABLE IF NOT EXISTS threads (createdThreadId TEXT,threadId TEXT, forumId TEXT);');
	}
};