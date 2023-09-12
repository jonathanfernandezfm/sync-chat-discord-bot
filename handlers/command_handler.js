const fs = require('node:fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
	const foldersPath = path.join(__dirname, '../commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandsFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

		for (const file of commandsFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);

			if ('data' in command && 'execute' in command) {
				client.slash.set(command.data.name, command);
			} else {
				logger.warn(`The command at ${file} is missing a required "data" or "execute" property.`);
			}
		}
	}
};