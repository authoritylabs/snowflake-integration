import snowflake from 'snowflake-sdk';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

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
    console.log('Establishing connection...');

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

      console.log('Successfully established connection to Snowflake');
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
            console.log('Error encountered when terminating Snowflake connection');
            resolve(false);
            return;
          }

          console.log('Snowflake connection was terminated');
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

async function createS3StorageIntegration() {
  const connection = await createConnection();
  // const integration = await connection.execute();

  await connection.close();

  return 'TODO';
}

async function testCredentials() {
  const connection = await createConnection();
  await connection.close();

  return true;
}

export default { createS3StorageIntegration, testCredentials };
