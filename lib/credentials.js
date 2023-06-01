import Conf from 'conf';

const config = new Conf({ projectName: 'serp2snow' });

export default {
  getCredentials() {
    return config.get('credentials') ?? {};
  },

  saveAwsCredentials(hash) {
    config.set('credentials.aws', hash);
  },

  saveSerpWowCredentials(hash) {
    config.set('credentials.serpWow', hash);
  },

  saveSnowflakeCredentials(hash) {
    config.set('credentials.snowflake', hash);
  },

  clearCredentials() {
    config.delete('credentials');
  },
};
