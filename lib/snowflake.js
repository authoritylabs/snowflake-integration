import snowflake from 'snowflake-sdk';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

const STORAGE_INTEGRATION_NAME = 'SERPWOW_RESULTS_S3';

function getAuthOptions({ authMethod, password, privateKeyPath }) {
  if (authMethod === 'PASSWORD') {
    return {
      authenticator: 'SNOWFLAKE',
      password,
    };
  }

  if (authMethod === 'KEY_PAIR') {
    return {
      authenticator: 'SNOWFLAKE_JWT',
      privateKeyPath,
    };
  }

  throw new Error('Unsupported authentication method');
}

function createConnectionOptions(credentials) {
  const { account, username } = credentials;

  return {
    account,
    username,
    ...getAuthOptions(credentials),
  };
}

function connectToSnowflake() {
  const credentials = getCredentials().snowflake;
  const options = createConnectionOptions(credentials);

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(options);

    connection.connect((err, conn) => {
      if (err) {
        console.error(`Unable to connect: ${err.message}`);
        const { response } = err;

        if (response) {
          console.error(`Status: ${response.status} ${response.statusMessage}`);
        }

        reject(err);
        return;
      }

      resolve(conn);
    });
  });
}

async function createConnection() {
  const connection = await connectToSnowflake();

  return {
    close() {
      return new Promise((resolve) => {
        connection.destroy((err) => {
          if (err) {
            console.error('Error encountered when terminating Snowflake connection');
            resolve(false);
            return;
          }

          resolve(true);
        });
      });
    },

    execute(statement) {
      return new Promise((resolve, reject) => {
        connection.execute({
          sqlText: statement,
          complete: (err, stmt, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          },
        });
      });
    },
  };
}

async function executeCreateIntegration(conn, { bucketName, roleArn }) {
  const statement = `CREATE STORAGE INTEGRATION ${STORAGE_INTEGRATION_NAME}
    TYPE = EXTERNAL_STAGE
    STORAGE_PROVIDER = 'S3'
    ENABLED = TRUE
    STORAGE_AWS_ROLE_ARN = '${roleArn}'
    STORAGE_ALLOWED_LOCATIONS = ('s3://${bucketName}/');`;

  return conn.execute(statement);
}

async function executeGetIntegration(conn) {
  const statement = `DESC INTEGRATION ${STORAGE_INTEGRATION_NAME}`;
  const props = await conn.execute(statement);
  const userArn = props.find(({ property }) => property === 'STORAGE_AWS_IAM_USER_ARN');
  const externalId = props.find(({ property }) => property === 'STORAGE_AWS_EXTERNAL_ID');

  return {
    name: STORAGE_INTEGRATION_NAME,
    awsUserArn: userArn?.property_value,
    awsExternalId: externalId?.property_value,
  };
}

async function createS3StorageIntegration(awsDetails) {
  const connection = await createConnection();

  const integration = await executeCreateIntegration(connection, awsDetails)
    .then(() => executeGetIntegration(connection))
    .catch(async (error) => {
      await connection.close();
      throw error;
    });

  await connection.close();

  return integration;
}

async function testCredentials() {
  console.log('Establishing connection...');
  const connection = await createConnection();
  await connection.close();

  return true;
}

export default { createS3StorageIntegration, testCredentials };
