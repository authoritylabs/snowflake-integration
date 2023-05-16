import boxen from 'boxen';
import chalk from 'chalk';
import inquirer from 'inquirer';
import credentials from './credentials.js';
import snowflake from './snowflake.js';

const SUCCESS = chalk.green('SUCCESS');
const FAILURE = chalk.red('FAILURE');

function validateRequiredInput(value) {
  if (value.length) {
    return true;
  }

  return 'Input required';
}

function promptSnowflakePasswordAuth() {
  const questions = [
    {
      type: 'input',
      name: 'account',
      message: 'Enter your Snowflake account identifier:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter the Snowflake login user:',
      validate: validateRequiredInput,
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter the user password:',
      validate: validateRequiredInput,
    },
  ];

  return inquirer
    .prompt(questions)
    .then((answers) => {
      credentials.saveSnowflakeCredentials({
        authMethod: 'PASSWORD',
        account: answers.account,
        username: answers.username,
        password: answers.password,
      });

      console.log('Credentials saved!\n');
    });
}

function promptSnowflakeKeyPairAuth() {
  const questions = [
    {
      type: 'input',
      name: 'account',
      message: 'Enter your Snowflake account identifier:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter the Snowflake login user:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'privateKeyPath',
      message: 'Enter the local path to the user private key file:',
      validate: validateRequiredInput,
    },
  ];

  return inquirer
    .prompt(questions)
    .then((answers) => {
      credentials.saveSnowflakeCredentials({
        authMethod: 'KEY_PAIR',
        account: answers.account,
        username: answers.username,
        privateKeyPath: answers.privateKeyPath,
      });

      console.log('Credentials saved!\n');
    });
}

async function promptSnowflakeInput() {
  const questions = [
    {
      type: 'list',
      name: 'sf-auth-method',
      message: 'Which authentication method to use for Snowflake:',
      choices: [
        {
          name: 'Password',
          value: 'password-auth',
        },
        {
          name: 'Key Pair',
          value: 'key-pair-auth',
        },
      ],
    },
  ];

  await inquirer
    .prompt(questions)
    .then(({ 'sf-auth-method': answer }) => {
      if (answer === 'password-auth') {
        return promptSnowflakePasswordAuth();
      }

      if (answer === 'key-pair-auth') {
        return promptSnowflakeKeyPairAuth();
      }

      throw new Error('Invalid auth option');
    });
}

async function promptAllCredentialsInput() {
  await promptSnowflakeInput();
}

async function promptInput() {
  const questions = [
    {
      type: 'list',
      name: 'credential-input',
      message: 'Which credentials to update:',
      choices: [
        {
          name: 'All',
          value: 'all',
        },
        // {
        //   name: 'AWS',
        //   value: 'aws',
        // },
        // {
        //   name: 'SerpWow',
        //   value: 'serpwow',
        // },
        {
          name: 'Snowflake',
          value: 'snowflake',
        },
      ],
    },
  ];

  await inquirer
    .prompt(questions)
    .then(({ 'credential-input': answer }) => {
      if (answer === 'all') {
        return promptAllCredentialsInput();
      }

      if (answer === 'snowflake') {
        return promptSnowflakeInput();
      }

      throw new Error('Invalid credential input option');
    });
}

function testSnowflake() {
  return snowflake.testCredentials()
    .then(() => SUCCESS)
    .catch((error) => {
      console.error(chalk.red(error.message));
      return FAILURE;
    });
}

function testAws() {
  console.error(chalk.red('TODO: Implement'));

  return FAILURE;
}

function testSerpWow() {
  console.error(chalk.red('TODO: Implement'));

  return FAILURE;
}

async function testCredentials() {
  console.log(chalk.yellow('Checking Snowflake credentials'));
  const snowflakeResult = await testSnowflake();

  console.log(chalk.yellow('Checking AWS credentials'));
  const awsResult = await testAws();

  console.log(chalk.yellow('Checking SerpWow credentials'));
  const serpWowResult = await testSerpWow();

  const summary = [
    `Snowflake: ${snowflakeResult}`,
    `AWS: ${awsResult}`,
    `SerpWow: ${serpWowResult}`,
  ].join('\n');

  const boxOptions = { padding: 0.5, borderColor: 'gray', title: 'Results' };
  console.log(boxen(summary, boxOptions));
}

export default { promptInput, testCredentials };
