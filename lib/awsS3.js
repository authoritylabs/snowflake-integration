import {
  S3Client,
  CreateBucketCommand,
  PutBucketNotificationConfigurationCommand,
} from '@aws-sdk/client-s3';

import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

function createS3Client() {
  const credentials = getCredentials().aws ?? {};
  const client = new S3Client({ credentials });

  return {
    async createBucket(name) {
      const input = { Bucket: name };
      const command = new CreateBucketCommand(input);
      const response = await client.send(command);

      return {
        name,
        location: response.Location,
      };
    },

    async createEventNotification(bucketName, queueArn) {
      const input = {
        Bucket: bucketName,
        NotificationConfiguration: {
          QueueConfigurations: [{
            Id: 'notify-snowflake-auto-ingest-pipe',
            Events: ['s3:ObjectCreated:*'],
            QueueArn: queueArn,
            Filter: {
              Key: {
                FilterRules: [{
                  Name: 'suffix',
                  Value: '.json',
                }],
              },
            },
          }],
        },
      };

      const command = new PutBucketNotificationConfigurationCommand(input);
      await client.send(command);

      return true;
    },
  };
}

export default createS3Client;
