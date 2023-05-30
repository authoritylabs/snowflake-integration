/* eslint-disable no-use-before-define */
import chalk from 'chalk';
import inquirer from 'inquirer';
import cliHelper from './cliHelper.js';
import createIAMClient from './awsIAM.js';
import createS3Client from './awsS3.js';
import credentialHelper from './credentials.js';
import savedProgress from './setupProgress.js';
import snowflake from './snowflake.js';

const { promptToContinue, validateRequiredInput } = cliHelper;
const { getCredentials } = credentialHelper;

const SETUP_FAILED_TYPE = 'SetupFailed';

function setupFailedError(message) {
  const error = new Error(message);
  error.type = SETUP_FAILED_TYPE;

  return error;
}

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

async function handleInitialInputState(state) {
  const bucketName = state.bucket.name;
  const credentials = getCredentials().aws ?? {};
  const s3 = createS3Client(credentials);

  console.log(chalk.yellow(`Creating S3 bucket "${bucketName}"`));

  const bucket = await s3
    .createBucket(bucketName)
    .catch(handleCreateBucketError);

  const resource = {
    source: 'AWS',
    type: 'S3 Bucket',
    id: bucketName,
  };

  const newState = {
    ...state,
    lastAction: 'BUCKET_CREATED',
    bucket,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

function getCreatePolicyErrorMessage(type) {
  if (type === 'EntityAlreadyExistsException') {
    return 'Delete the IAM policy from AWS then try again';
  }

  return 'Verify permissions for AWS credentials then try again';
}

function handleCreatePolicyError(error) {
  console.log(chalk.red(`Failed to create IAM policy: ${error.message}`));
  const message = getCreatePolicyErrorMessage(error.name);

  throw setupFailedError(message);
}

async function handleBucketCreatedState(state) {
  const bucketName = state.bucket.name;
  const credentials = getCredentials().aws ?? {};
  const iam = createIAMClient(credentials);

  console.log(chalk.yellow('Creating IAM policy for S3 access'));

  const policy = await iam
    .createSnowflakeAccessPolicy(bucketName)
    .catch(handleCreatePolicyError);

  const resource = {
    source: 'AWS',
    type: 'IAM Policy',
    id: policy.name,
  };

  const newState = {
    ...state,
    lastAction: 'SNOWFLAKE_POLICY_CREATED',
    snowflakeAccessPolicy: policy,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

function getCreateRoleErrorMessage(type) {
  if (type === 'EntityAlreadyExistsException') {
    return 'Delete the IAM role from AWS then try again';
  }

  return 'Verify permissions for AWS credentials then try again';
}

function handleCreateRoleError(error) {
  console.log(chalk.red(`Failed to create IAM role: ${error.message}`));
  const message = getCreateRoleErrorMessage(error.name);

  throw setupFailedError(message);
}

async function handleSnowflakePolicyCreatedState(state) {
  const credentials = getCredentials().aws ?? {};
  const iam = createIAMClient(credentials);

  console.log(chalk.yellow('Creating IAM role for Snowflake'));

  const role = await iam
    .createSnowflakeRole()
    .catch(handleCreateRoleError);

  const resource = {
    source: 'AWS',
    type: 'IAM Role',
    id: role.name,
  };

  const newState = {
    ...state,
    lastAction: 'SNOWFLAKE_ROLE_CREATED',
    snowflakeRole: role,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

function getCreateStorageIntegrationErrorMessage(sqlState) {
  if (sqlState === '42710') {
    return 'Delete the storage integration from Snowflake then try again';
  }

  return 'Verify privileges for Snowflake user then try again';
}

function handleCreateStorageIntegrationError(error) {
  console.log(chalk.red(`Failed to create Snowflake storage integration: ${error.message}`));
  const message = getCreateStorageIntegrationErrorMessage(error.sqlState);

  throw setupFailedError(message);
}

async function handleSnowflakeRoleCreatedState(state) {
  const { snowflakeRole, bucket } = state;

  console.log(chalk.yellow('Creating Snowflake storage integration to S3'));

  const storageIntegration = await snowflake
    .createS3StorageIntegration({ roleArn: snowflakeRole.arn, bucketName: bucket.name })
    .catch(handleCreateStorageIntegrationError);

  const resource = {
    source: 'Snowflake',
    type: 'Storage Integration',
    id: storageIntegration.name,
  };

  const newState = {
    ...state,
    lastAction: 'STORAGE_INTEGRATION_CREATED',
    storageIntegration,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

function handleUpdateRolePolicyError(error) {
  console.log(chalk.red(`Failed to update IAM role: ${error.message}`));
  const message = 'Verify permissions for AWS credentials then try again';

  throw setupFailedError(message);
}

async function handleStorageIntegrationCreatedState(state) {
  const credentials = getCredentials().aws ?? {};
  const iam = createIAMClient(credentials);
  const { storageIntegration } = state;

  console.log(chalk.yellow('Granting storage integration access to IAM role'));

  await iam
    .updateSnowflakeRolePolicy(storageIntegration)
    .catch(handleUpdateRolePolicyError);

  const newState = {
    ...state,
    lastAction: 'SNOWFLAKE_ROLE_UPDATED',
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

async function promptDbSchemaInput() {
  console.log(`\nA Snowflake ${chalk.yellow('database')} and ${chalk.yellow('schema')} where result data will be loaded are needed for the next steps.`);
  console.log(chalk.yellow('Ensure these exist in your Snowflake account before continuing\n'));
  await promptToContinue();

  const questions = [
    {
      type: 'input',
      name: 'database',
      message: 'Enter the database name:',
      validate: validateRequiredInput,
    },
    {
      type: 'input',
      name: 'schema',
      message: 'Enter the schema name:',
      validate: validateRequiredInput,
    },
  ];

  return inquirer.prompt(questions);
}

function getCreateTableErrorMessage(sqlState) {
  if (sqlState === '02000') {
    return 'Verify that both the database and schema exist and the provided user has sufficient privileges then try again';
  }

  return 'Verify privileges for Snowflake user then try again';
}

async function handleCreateTableError(error) {
  console.log(chalk.red(`Failed to create Snowflake table: ${error.message}`));
  const message = getCreateTableErrorMessage(error.sqlState);

  throw setupFailedError(message);
}

async function handleSnowflakeRoleUpdatedState(state) {
  const { database, schema } = await promptDbSchemaInput();

  console.log(chalk.yellow('Creating Snowflake table for results data'));

  const table = await snowflake
    .createTable(database, schema)
    .catch(handleCreateTableError);

  const resource = {
    source: 'Snowflake',
    type: 'Table',
    id: table.name,
  };

  const newState = {
    ...state,
    lastAction: 'TABLE_CREATED',
    database,
    schema,
    table,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

function getCreateStageErrorMessage(sqlState) {
  if (sqlState === '02000') {
    return 'Verify that both the database and schema exist and the provided user has sufficient privileges then try again';
  }

  if (sqlState === '42710') {
    return 'Delete the stage from Snowflake then try again';
  }

  return 'Verify privileges for Snowflake user then try again';
}

function handleCreateStageError(error) {
  console.log(chalk.red(`Failed to create Snowflake stage: ${error.message}`));
  const message = getCreateStageErrorMessage(error.sqlState);

  throw setupFailedError(message);
}

async function handleTableCreatedState(state) {
  const stageOptions = {
    database: state.database,
    schema: state.schema,
    bucket: state.bucket.name,
    storageIntegration: state.storageIntegration.name,
  };

  console.log(chalk.yellow('Creating Snowflake stage for S3'));

  const stage = await snowflake
    .createStage(stageOptions)
    .catch(handleCreateStageError);

  const resource = {
    source: 'Snowflake',
    type: 'Stage',
    id: stage.name,
  };

  const newState = {
    ...state,
    lastAction: 'STAGE_CREATED',
    stage,
    createdResources: [...state.createdResources, resource],
  };

  savedProgress.setState(newState);

  return processNextSetupState(newState);
}

async function handleStageCreatedState(state) {
  console.log('TODO');
}

async function processNextSetupState(currentState) {
  const stateProgression = {
    INITIAL_INPUT: handleInitialInputState,
    BUCKET_CREATED: handleBucketCreatedState,
    SNOWFLAKE_POLICY_CREATED: handleSnowflakePolicyCreatedState,
    SNOWFLAKE_ROLE_CREATED: handleSnowflakeRoleCreatedState,
    STORAGE_INTEGRATION_CREATED: handleStorageIntegrationCreatedState,
    SNOWFLAKE_ROLE_UPDATED: handleSnowflakeRoleUpdatedState,
    TABLE_CREATED: handleTableCreatedState,
    STAGE_CREATED: handleStageCreatedState,
  };

  const handleNext = stateProgression[currentState.lastAction];

  if (!handleNext) {
    throw new Error('Received unexpected setup state');
  }

  return handleNext(currentState)
    .catch((error) => {
      if (error.type === SETUP_FAILED_TYPE) {
        console.log('Setup did not complete successfully');
        console.log(chalk.yellow(error.message));
        return;
      }

      throw error;
    });
}

async function promptNewSetup() {
  const question = {
    type: 'input',
    name: 's3-bucket',
    message: 'Enter the name of the S3 bucket to be created where SerpWow results will be stored:',
    validate: validateRequiredInput,
  };

  const bucketName = await inquirer
    .prompt(question)
    .then(async ({ 's3-bucket': answer }) => answer);

  const setupState = {
    lastAction: 'INITIAL_INPUT',
    bucket: { name: bucketName },
    createdResources: [],
  };

  return processNextSetupState(setupState);
}

async function promptToContinueSetup(setupState) {
  const continueSelected = await inquirer
    .prompt({
      type: 'confirm',
      name: 'continue-setup',
      message: 'An incomplete integration setup was found. Continue from the last successful state?',
    })
    .then(async ({ 'continue-setup': answer }) => answer);

  if (continueSelected) {
    return processNextSetupState(setupState);
  }

  const resourcesList = setupState
    .createdResources
    .map(({ source, type, id }) => ` * ${source} ${type} ${id}`)
    .join('\n');

  const resetMessage = `The following resources were created during a previous setup which will need to be ${chalk.red('manually destroyed')} before starting a new setup:
${chalk.red(resourcesList)}
Are you sure you want to continue?`;

  const confirmResetSetup = await inquirer
    .prompt({
      type: 'list',
      name: 'reset-setup',
      message: resetMessage,
      default: false,
      choices: [
        {
          name: 'These resources have been destroyed. Delete saved setup progress and continue with new setup.',
          value: true,
        },
        {
          name: 'Keep saved setup progress and return to main menu.',
          value: false,
        },
      ],
    })
    .then(async ({ 'reset-setup': answer }) => answer);

  if (!confirmResetSetup) {
    console.log(chalk.yellow('Existing setup progress will be preserved. Returning to main menu.'));
    return false;
  }

  savedProgress.clearState();
  console.log(chalk.yellow('Existing setup progress has been cleared. Starting new integration setup.'));

  return true;
}

async function promptSetup() {
  const existingSetupState = savedProgress.getState();

  if (existingSetupState) {
    return promptToContinueSetup(existingSetupState);
  }

  return promptNewSetup();
}

export default { promptSetup };
