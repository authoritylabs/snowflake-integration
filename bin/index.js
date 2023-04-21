#!/usr/bin/env node

import { format } from 'util';
import cli from '../lib/cli.js';

function getErrorMessage(error) {
  if (typeof error !== 'object' || error === null) {
    return String(error);
  }

  if (typeof error.stack === 'string') {
    return error.stack;
  }

  return format('%o', error);
}

function onFatalError(error) {
  process.exitCode = 2;
  const message = getErrorMessage(error);

  console.error(`
An unexpected error was encountered!

${message}`);
}

process.on('uncaughtException', onFatalError);
process.on('unhandledRejection', onFatalError);

await cli.start();
