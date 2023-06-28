import axios from 'axios';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

async function createS3Destination({ bucket, iamUser }) {
  const { apiKey } = getCredentials().serpWow ?? {};
  const destinationName = 'SNOWFLAKE_S3_INTEGRATION';

  const body = {
    name: destinationName,
    type: 's3',
    enabled: true,
    s3_access_key_id: iamUser?.accessKeyId,
    s3_secret_access_key: iamUser?.secretAccessKey,
    s3_bucket_name: bucket?.name,
  };

  const url = `https://api.valueserp.com/destinations?api_key=${apiKey}`;

  const { data } = await axios
    .post(url, body)
    .catch((error) => {
      const reason = error.response?.data?.request_info?.message;

      if (!reason) {
        throw error;
      }

      throw new Error(reason);
    });

  return { name: destinationName, id: data?.destination?.id };
}

async function getAccount(apiKey) {
  const params = { api_key: apiKey };

  return axios.get('https://api.valueserp.com/account', { params });
}

async function testCredentials() {
  const credentials = getCredentials().serpWow ?? {};

  return getAccount(credentials.apiKey);
}

export default { createS3Destination, testCredentials };
