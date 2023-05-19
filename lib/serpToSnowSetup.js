/* eslint-disable no-use-before-define */
import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
import createIAMClient from './awsIAM.js';
import createS3Client from './awsS3.js';
import credentialHelper from './credentials.js';

const { validateRequiredInput } = cliHelper;
const { getCredentials } = credentialHelper;

const SETUP_FAILED_TYPE = 'SetupFailed';

function getCreateBucketErrorMessage(type) {
  if (type === 'AccessDenied') {
    return 'Verify permissions for AWS credentials then try again';
  }

  if (type === 'InvalidBucketName') {
    return 'Try again with a valid bucket name';
  }

  if (type === 'BucketAlreadyOwnedByYou' || type === 'BucketAlreadyExists') {
    return 'Either delete the existing bucket or choose a unique name then try again';
  }

  return 'Verify permissions and input values then try again';
}

function handleCreateBucketError(error) {
  console.log(chalk.red(`Failed to create bucket: ${error.message}`));
  const message = getCreateBucketErrorMessage(error.name);
  const e = new Error(message);
  e.type = SETUP_FAILED_TYPE;

  throw e;
}

function handleCreatePolicyError(error) {
  console.log(chalk.red(`Failed to create IAM policy: ${error.message}`));
  const message = 'Verify permissions for AWS credentials then try again';
  const e = new Error(message);
  e.type = SETUP_FAILED_TYPE;

  throw e;
}

async function handleInitalInputState(state) {
  const bucketName = state.bucket.name;
  const credentials = getCredentials().aws ?? {};
  const s3 = createS3Client(credentials);

  console.log(chalk.yellow(`Creating S3 bucket "${bucketName}"`));

  const bucket = await s3
    .createBucket(bucketName)
    .catch(handleCreateBucketError);

  const newState = {
    ...state,
    lastAction: 'BUCKET_CREATED',
    bucket,
  };

  return processNextSetupState(newState);
}

async function handleBucketCreatedState(state) {
  const bucketName = state.bucket.name;
  const credentials = getCredentials().aws ?? {};
  const iam = createIAMClient(credentials);

  const iamPolicy = await iam
    .createSnowflakeAccessPolicy(bucketName)
    .catch(handleCreatePolicyError);

  console.log(iamPolicy);
}

async function processNextSetupState(currentState) {
  const stateProgression = {
    INITIAL_INPUT: handleInitalInputState,
    BUCKET_CREATED: handleBucketCreatedState,
  };

  const handleNext = stateProgression[currentState.lastAction];

  return handleNext(currentState);
}

async function setupIntegration({ bucketName }) {
  const setupState = {
    lastAction: 'INITIAL_INPUT',
    bucket: { name: bucketName },
  };

  return processNextSetupState(setupState);
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

  return setupIntegration({ bucketName })
    .catch((error) => {
      if (error.type === SETUP_FAILED_TYPE) {
        console.log('Setup did not complete successfully');
        console.log(chalk.yellow(error.message));
        return;
      }

      throw error;
    });
}

export default { promptSetup };
