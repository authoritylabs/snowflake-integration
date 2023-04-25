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

      console.log('Credentials saved!');
    });
}

async function promptInput() {
  const questions = [
    {
      type: 'list',
      name: 'sf-auth-method',
      message: 'Which authentication method for Snowflake:',
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
        throw new Error('TODO')
        return () => console.log('TODO');
      }

      throw new Error('Invalid auth option');
    });
}

function testSnowflake() {
  return snowflake.testCredentials()
    .then(() => SUCCESS)
    .catch((error) => {
      console.error(error.message);
      return FAILURE;
    });
}

async function testCredentials() {
  console.log('Checking Snowflake credentials...');
  const snowflakeResult = await testSnowflake();

  const summary = [
    `Snowflake: ${snowflakeResult}`,
  ].join('\n');

  const boxOptions = { padding: 0.5, title: 'Results' };
  console.log(boxen(summary, boxOptions));
}

export default { promptInput, testCredentials };
