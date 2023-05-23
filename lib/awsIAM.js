import { IAMClient, CreatePolicyCommand, CreateRoleCommand } from '@aws-sdk/client-iam';

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

function createSnowflakeAssumeRolePolicyDocument(accountId) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'sts:AssumeRole',
        Principal: {
          AWS: accountId,
        },
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
      const { Policy } = await client.send(command);

      return {
        name: Policy?.PolicyName,
        arn: Policy?.Arn,
      };
    },

    async createSnowflakeRole() {
      const { account } = credentials;

      const input = {
        RoleName: 'serpwow_integration_snowflake_external',
        AssumeRolePolicyDocument: createSnowflakeAssumeRolePolicyDocument(account),
      };

      const command = new CreateRoleCommand(input);
      const { Role } = await client.send(command);

      return {
        name: Role?.RoleName,
        arn: Role?.Arn,
      };
    },
  };
}

export default createIAMClient;
