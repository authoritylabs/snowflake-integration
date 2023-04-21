import inquirer from 'inquirer';
import credentials from './credentials.js';

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
      name: 'sf-account',
      message: 'Enter your Snowflake account identifier:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'sf-username',
      message: 'Enter your Snowflake login name:',
      validate: validateRequiredInput,
    },
  ];

  return inquirer
    .prompt(questions)
    .then((answers) => {
      credentials.saveSnowflakeCredentials({
        account: answers['sf-account'],
        username: answers['sf-username'],
      });
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
        return () => console.log('TODO');
      }

      throw new Error('Invalid auth option');
    });

  console.log('Credentials saved!');
}

export default { promptInput };
