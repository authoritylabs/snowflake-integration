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

export default { promptInput };
