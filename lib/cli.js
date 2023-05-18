import boxen from 'boxen';
import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
import credentialOptions from './credentialOptions.js';
import credentials from './credentials.js';
import credentialsCheck from './credentialsCheck.js';
import serpToSnowSetup from './serpToSnowSetup.js';

const { clearCredentials, getCredentials } = credentials;

function isCredsMissing() {
  const { account, username } = getCredentials().snowflake ?? {};

  if (!account || !username) {
    return true;
  }

  return false;
}

function printCredsBoxText() {
  const { aws, snowflake } = getCredentials();

  const blue = chalk.hex('249edc');
  const orange = chalk.hex('ff9900');
  const missing = chalk.red('NOT SET');

  const splashText = [
    `${orange('AWS account:')} ${aws?.account ?? missing}`,
    `${orange('AWS access key ID:')} ${aws?.accessKeyId ?? missing}`,
    `${blue('Snowflake auth method:')} ${snowflake?.authMethod ?? missing}`,
    `${blue('Snowflake account:')} ${snowflake?.account ?? missing}`,
    `${blue('Snowflake username:')} ${snowflake?.username ?? missing}`,
  ].join('\n');

  const boxOptions = { padding: 0.5, borderColor: 'gray', title: 'Saved Credentials' };
  console.log(boxen(splashText, boxOptions));
}

async function promptSecondaryMenu() {
  const question = {
    type: 'list',
    name: 'secondary-menu',
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
        name: 'Go to previous menu',
        value: 'back',
      },
    ],
  };

  await inquirer
    .prompt(question)
    .then(async ({ 'secondary-menu': answer }) => {
      if (answer === 'update-credentials') {
        await credentialOptions.promptInputOptions();
      }

      if (answer === 'clear-credentials') {
        await clearCredentials();
        console.log('Credentials cleared.\n');
        await cliHelper.promptToContinue();
      }
    });
}

async function promptMainMenu() {
  const question = {
    type: 'list',
    name: 'main-menu',
    message: 'Choose an option below',
    choices: [
      {
        name: 'Test credentials',
        value: 'test-credentials',
      },
      {
        name: 'Setup SerpWow to Snowflake integration',
        value: 'setup-serp-to-snow-integration',
      },
      {
        name: 'More options',
        value: 'more-options',
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

      if (answer === 'more-options') {
        await promptSecondaryMenu();
      }

      if (answer === 'test-credentials') {
        await credentialsCheck.promptOptions();
        await cliHelper.promptToContinue();
      }

      if (answer === 'setup-serp-to-snow-integration') {
        await serpToSnowSetup.createIntegration();
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
      await credentialOptions.promptInputAll();
    }

    await promptMainMenu();
  },
};

export default cli;
