const { sendMessageToChannel } = require('../slack');
const { SLACK_REPORTING_CHANNEL } = require('../config');

process.on('uncaughtException', (err) => {
  console.log(process.env);
  if (process.env.GITHUB_WORKFLOW) {
    let message = `Uncaught exception while executing ${process.env.GITHUB_WORKFLOW}\n`;
    message += `\`\`\`\n${err.stack}\n\`\`\``;
    console.log('Reporting to Slack...');
    sendMessageToChannel(SLACK_REPORTING_CHANNEL, message);
  }
  throw err;
});
