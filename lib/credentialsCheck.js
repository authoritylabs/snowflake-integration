import boxen from 'boxen';
import chalk from 'chalk';
import inquirer from 'inquirer';
import snowflake from './snowflake.js';

const SUCCESS = chalk.green('SUCCESS');
const FAILURE = chalk.red('FAILURE');

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

async function testAll() {
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

async function testCredentials(type) {
  const testers = {
    aws: testAws,
    serpwow: testSerpWow,
    snowflake: testSnowflake,
  };

  const tester = testers[type];

  if (!tester) {
    throw new Error(`Invalid credential test option: ${type}`);
  }

  const result = await tester();
  const boxOptions = { padding: 0.5, borderColor: 'gray', title: 'Result' };
  console.log(boxen(result, boxOptions));
}

async function promptOptions() {
  const questions = [
    {
      type: 'list',
      name: 'credential-test',
      message: 'Which credentials to test:',
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
          value: 'serpwow',
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
    .then(({ 'credential-test': answer }) => {
      if (answer === 'all') {
        return testAll();
      }

      return testCredentials(answer);
    });
}

export default { promptOptions };