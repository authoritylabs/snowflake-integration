import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
import createS3Client from './awsS3.js';
import credentialHelper from './credentials.js';

const { validateRequiredInput } = cliHelper;
const { getCredentials } = credentialHelper;

async function setupIntegration({ bucketName }) {
  const credentials = getCredentials();
  const s3 = createS3Client(credentials.aws ?? {});

  console.log(chalk.yellow(`Creating S3 bucket "${bucketName}"`));

  await s3
    .createBucket(bucketName)
    .catch((error) => {
      console.log(chalk.red(error.message));
      console.log('Verify permissions and input values then try again');
    });
}

async function promptSetup() {
  const question = {
    type: 'input',
    name: 's3-bucket',
    message: 'Enter the name of the S3 bucket to be created where SerpWow results will be stored:',
    validate: validateRequiredInput,
  };

  const bucketName = await inquirer
    .prompt(question)
    .then(async ({ 's3-bucket': answer }) => answer);

  return setupIntegration({ bucketName });
}

export default { promptSetup };
