const { sendMessageToChannel } = require('../slack');
const { SLACK_REPORTING_CHANNEL } = require('../config');

process.on('uncaughtException', (err) => {
  if (process.env.GITHUB_ACTION) {
    let message = `Uncaught exception while executing ${process.env.GITHUB_ACTION}\n`;
    message += `\`\`\`\n${err.stack}\n\`\`\``;
    sendMessageToChannel(SLACK_REPORTING_CHANNEL, message);
  }
  throw err;
});
