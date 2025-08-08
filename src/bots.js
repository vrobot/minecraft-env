const bots = {}; // Global storage for all bot instances

function registerBot(botInstance) {
    bots[botInstance.name] = botInstance; // Store bot by its name
    console.log(`${botInstance.name} registered.`);
}

function getBotByName(name) {
    return bots[name] || null; // Retrieve a bot by name
}

module.exports = { bots, registerBot, getBotByName };