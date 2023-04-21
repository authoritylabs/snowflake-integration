import Conf from 'conf';

const config = new Conf({ projectName: 'serp2snow' });

export default {
  getCredentials() {
    return config.get('credentials') ?? {};
  },

  saveSnowflakeCredentials(hash) {
    config.set('credentials.snowflake', hash);
  },

  clearCredentials() {
    config.delete('credentials');
  },
};
