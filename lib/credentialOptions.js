import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
import credentials from './credentials.js';

const { validateRequiredInput } = cliHelper;

async function promptAwsInput() {
  console.log(chalk.yellow('Updating AWS credentials'));

  const questions = [
    {
      type: 'input',
      name: 'account',
      message: 'Enter your AWS account ID:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'accessKeyId',
      message: 'Enter your AWS access key ID:',
      validate: validateRequiredInput,
    },
    {
      type: 'password',
      name: 'secretAccessKey',
      message: 'Enter your AWS secret access key:',
      validate: validateRequiredInput,
    },
  ];

  return inquirer
    .prompt(questions)
    .then((answers) => {
      credentials.saveAwsCredentials({
        account: answers.account,
        accessKeyId: answers.accessKeyId,
        secretAccessKey: answers.secretAccessKey,
      });

      console.log('Credentials saved!\n');
    });
}

async function promptSerpWowInput() {
  console.log(chalk.yellow('Updating SerpWow credentials'));

  const question = {
    type: 'password',
    name: 'apiKey',
    message: 'Enter your SerpWow API key:',
    validate: validateRequiredInput,
  };

  return inquirer
    .prompt(question)
    .then(({ apiKey }) => {
      credentials.saveSerpWowCredentials({ apiKey });

      console.log('Credentials saved!\n');
    });
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
  console.log(chalk.yellow('Updating Snowflake credentials'));

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

async function promptInputAll() {
  await promptAwsInput();
  await promptSerpWowInput();
  await promptSnowflakeInput();
}

async function promptInputOptions() {
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
        {
          name: 'AWS',
          value: 'aws',
        },
        {
          name: 'SerpWow',
          value: 'serpWow',
        },
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
        return promptInputAll();
      }

      if (answer === 'aws') {
        return promptAwsInput();
      }

      if (answer === 'serpWow') {
        return promptSerpWowInput();
      }

      if (answer === 'snowflake') {
        return promptSnowflakeInput();
      }

      throw new Error('Invalid credential input option');
    });
}

export default { promptInputAll, promptInputOptions };
