const { registerBot } = require('./bots');
const Bot = require('./bot');

// **Create & Register Bots**
const bot1 = new Bot('johnson', 8081);
const bot2 = new Bot('singh', 8082);
const bot3 = new Bot('jeremiah', 8083);
const bot4 = new Bot('wafflebottom', 8084);

registerBot(bot1);
registerBot(bot2);
registerBot(bot3);
registerBot(bot4);

console.log('All bots have been instantiated');