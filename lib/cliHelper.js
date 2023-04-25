function promptToContinue() {
  console.log('Press any key to continue...');

  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

export default { promptToContinue };
