import boxen from 'boxen';
import chalk from 'chalk';
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

export default { testCredentials };
