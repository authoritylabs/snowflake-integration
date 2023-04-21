import boxen from 'boxen';
import inquirer from 'inquirer';
import credentialOptions from './credentialOptions.js';
import credentials from './credentials.js';

const { clearCredentials, getCredentials } = credentials;

function isCredsMissing() {
  const { account, username } = getCredentials().snowflake ?? {};

  if (!account || !username) {
    return true;
  }

  return false;
}

function setupSerpToSnowIntegration() {
  console.log('TODO');
}

function printCredsBoxText() {
  const { account, username } = getCredentials().snowflake ?? {};

  const splashText = [
    `Snowflake auth method: ${'todo'}`,
    `Snowflake account: ${account}`,
    `Snowflake username: ${username}`,
  ].join('\n');

  console.log(boxen(splashText, { padding: 0.5, title: 'Saved Credentials' }));
}

async function promptMainMenu() {
  const question = {
    type: 'list',
    name: 'main-menu',
    message: 'Choose an option below',
    choices: [
      {
        name: 'Update credentials',
        value: 'update-credentials',
      },
      {
        name: 'Clear saved credentials',
        value: 'clear-credentials',
      },
      {
        name: 'Setup SerpWow to Snowflake integration',
        value: 'setup-serp-to-snow-integration',
      },
      {
        name: 'Exit tool',
        value: 'exit',
      },
    ],
  };

  printCredsBoxText();

  await inquirer
    .prompt(question)
    .then(async ({ 'main-menu': answer }) => {
      if (answer === 'exit') {
        console.log('Goodbye!');
        return null;
      }

      if (answer === 'update-credentials') {
        await credentialOptions.promptInput();
      }

      if (answer === 'clear-credentials') {
        await clearCredentials();
        console.log('Credentials cleared.');
      }

      if (answer === 'setup-serp-to-snow-integration') {
        await setupSerpToSnowIntegration();
      }

      return promptMainMenu();
    });
}

const cli = {
  async start() {
    console.log('This tool will help set up a data ingestion pipeline between SerpWow Batches and SnowFlake');

    if (isCredsMissing()) {
      console.log('Credentials not found...');
      await credentialOptions.promptInput();
    }

    await promptMainMenu();
  },
};

export default cli;
