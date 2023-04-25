import boxen from 'boxen';
import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
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
  const { account, authMethod, username } = getCredentials().snowflake ?? {};
  const title = chalk.hex('249edc');
  const missing = chalk.red('NOT SET');

  const splashText = [
    `${title('Snowflake auth method:')} ${authMethod ?? missing}`,
    `${title('Snowflake account:')} ${account ?? missing}`,
    `${title('Snowflake username:')} ${username ?? missing}`,
  ].join('\n');

  const boxOptions = { padding: 0.5, borderColor: 'gray', title: 'Saved Credentials' };
  console.log(boxen(splashText, boxOptions));
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
        name: 'Test credentials',
        value: 'test-credentials',
      },
      {
        name: 'Setup SerpWow to Snowflake integration',
        value: 'setup-serp-to-snow-integration',
      },
      {
        name: 'Clear saved credentials',
        value: 'clear-credentials',
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

      if (answer === 'test-credentials') {
        await credentialOptions.testCredentials();
        await cliHelper.promptToContinue();
      }

      if (answer === 'clear-credentials') {
        await clearCredentials();
        console.log('Credentials cleared.');
        await cliHelper.promptToContinue();
      }

      if (answer === 'setup-serp-to-snow-integration') {
        await setupSerpToSnowIntegration();
        await cliHelper.promptToContinue();
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
