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

function createConnection() {
  const credentials = getCredentials().snowflake;
  const options = createConnectionOptions(credentials);

  return snowflake.createConnection(options);
}

function connectToSnowflake() {
  return new Promise((resolve, reject) => {
    const connection = createConnection();
    console.log('Establishing connection...');

    connection.connect((err, conn) => {
      if (err) {
        console.error(`Unable to connect: ${err.message}`);
        console.error(`Status: ${err.response?.status} ${err.response?.statusMessage}`);
        reject(err);
        return;
      }

      console.log('Successfully established connection to Snowflake');
      resolve(conn);
    });
  });
}

async function testCredentials() {
  const connection = await connectToSnowflake();

  throw new Error('TODO: Test Snowflake');
}

export default { testCredentials };
