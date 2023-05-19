import { IAMClient, CreatePolicyCommand } from '@aws-sdk/client-iam';

function createSnowflakePolicyDocument(bucketName) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:GetObjectVersion',
        ],
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
      {
        Effect: 'Allow',
        Action: [
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        Resource: `arn:aws:s3:::${bucketName}`,
      },
    ],
  };

  return JSON.stringify(policy);
}

function createIAMClient(credentials) {
  const client = new IAMClient({ credentials });

  return {
    async createSnowflakeAccessPolicy(bucketName) {
      const input = {
        PolicyName: 'serpwow_results_snowflake_access',
        PolicyDocument: createSnowflakePolicyDocument(bucketName),
        Description: 'Allow authorized Snowflake users to list, read from, and write to S3.',
      };

      const command = new CreatePolicyCommand(input);
      await client.send(command);

      return true;
    },
  };
}

export default createIAMClient;
