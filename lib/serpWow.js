import axios from 'axios';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

async function getAccount(apiKey) {
  const params = { api_key: apiKey };

  return axios.get('https://api.serpwow.com/account', { params });
}

async function testCredentials() {
  const credentials = getCredentials().serpWow ?? {};

  return getAccount(credentials.apiKey);
}

export default { testCredentials };
