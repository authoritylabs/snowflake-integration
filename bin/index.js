#!/usr/bin/env node

// eslint-disable-next-line import/no-extraneous-dependencies
import awsWarning from 'aws-sdk/lib/maintenance_mode_message.js';
import { format } from 'util';
import cli from '../lib/cli.js';

// Workaround to supress AWS warning message until Snowflake updates to V3
// https://github.com/snowflakedb/snowflake-connector-nodejs/issues/365
awsWarning.suppress = true;

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
