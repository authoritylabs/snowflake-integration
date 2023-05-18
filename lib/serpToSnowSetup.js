import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';

const { validateRequiredInput } = cliHelper;

async function setupIntegration({ bucketName }) {
  console.log(`TODO: Create bucket: ${bucketName}`);
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
