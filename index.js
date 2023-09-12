require('dotenv').config(); 
const { Client, Collection, GatewayIntentBits } = require('discord.js');
var { initializeDB } = require('./db.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
initializeDB();

client.commands = new Collection();

['event_handler'].forEach((handler) => {
	require(`./handlers/${handler}`)(client);
});

client.login(process.env.TOKEN);
