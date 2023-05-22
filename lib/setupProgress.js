import Conf from 'conf';

const config = new Conf({ projectName: 'serp2snow' });

export default {
  clearState() {
    config.delete('setupProgress');
  },

  getState() {
    return config.get('setupProgress.lastState');
  },

  setState(state) {
    config.set('setupProgress.lastState', state);
  },
};
