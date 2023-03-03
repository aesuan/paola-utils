const { sendMessageToChannel } = require('../slack');
const { SLACK_REPORTING_CHANNEL } = require('../config');

process.on('uncaughtException', async (err) => {
  if (process.env.GITHUB_WORKFLOW) {
    let message = `Uncaught exception while executing workflow "${process.env.GITHUB_WORKFLOW}"\n`;
    message += `\`\`\`\n${err.stack}\n\`\`\``;
    console.log('Reporting to Slack...');
    await sendMessageToChannel(SLACK_REPORTING_CHANNEL, message);
  }
  console.error(err);
  process.exit(1);
});
