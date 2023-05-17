import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

async function getIdentity(credentials) {
  const client = new STSClient({ credentials });
  const input = {};
  const command = new GetCallerIdentityCommand(input);
  await client.send(command);

  return true;
}

async function testCredentials() {
  const credentials = getCredentials().aws ?? {};

  return getIdentity(credentials);
}

export default { testCredentials };
