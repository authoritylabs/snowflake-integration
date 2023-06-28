import {
  IAMClient,
  AttachRolePolicyCommand,
  AttachUserPolicyCommand,
  CreateAccessKeyCommand,
  CreatePolicyCommand,
  CreateRoleCommand,
  CreateUserCommand,
  UpdateAssumeRolePolicyCommand,
} from '@aws-sdk/client-iam';

import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

const SNOWFLAKE_ROLE_NAME = 'valueserp_integration_snowflake_external';

function createSerpWowPolicyDocument(bucketName) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          's3:PutObject',
          's3:DeleteObject',
        ],
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
    ],
  };

  return JSON.stringify(policy);
}

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

function createTempAssumeRolePolicyDocument(accountId) {
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

function createUpdatedAssumeRolePolicyDocument({ awsUserArn, awsExternalId }) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'sts:AssumeRole',
        Principal: {
          AWS: awsUserArn,
        },
        Condition: {
          StringEquals: {
            'sts:ExternalId': awsExternalId,
          },
        },
      },
    ],
  };

  return JSON.stringify(policy);
}

function createIAMClient() {
  const credentials = getCredentials().aws ?? {};
  const client = new IAMClient({ credentials });

  return {
    async attachPolicyToRole(policy, role) {
      const input = {
        RoleName: role?.name,
        PolicyArn: policy?.arn,
      };

      const command = new AttachRolePolicyCommand(input);
      await client.send(command);

      return true;
    },

    async attachPolicyToUser(policy, user) {
      const input = {
        UserName: user?.name,
        PolicyArn: policy?.arn,
      };

      const command = new AttachUserPolicyCommand(input);
      await client.send(command);

      return true;
    },

    async createSerpWowUser() {
      const userName = 'valueserp_results_upload_user';
      const input = { UserName: userName };
      const command = new CreateUserCommand(input);
      await client.send(command);

      return { name: userName };
    },

    async createSerpWowAccessPolicy(bucketName) {
      const input = {
        PolicyName: 'valueserp_results_write_to_s3',
        PolicyDocument: createSerpWowPolicyDocument(bucketName),
        Description: `Allow writing objects to S3 bucket ${bucketName}.`,
      };

      const command = new CreatePolicyCommand(input);
      const { Policy } = await client.send(command);

      return {
        name: Policy?.PolicyName,
        arn: Policy?.Arn,
      };
    },

    async createSnowflakeAccessPolicy(bucketName) {
      const input = {
        PolicyName: 'valueserp_results_snowflake_access',
        PolicyDocument: createSnowflakePolicyDocument(bucketName),
        Description: `Allow to list and read objects from S3 bucket ${bucketName}.`,
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
        RoleName: SNOWFLAKE_ROLE_NAME,
        AssumeRolePolicyDocument: createTempAssumeRolePolicyDocument(account),
      };

      const command = new CreateRoleCommand(input);
      const { Role } = await client.send(command);

      return {
        name: Role?.RoleName,
        arn: Role?.Arn,
      };
    },

    async createUserAccessKey({ name }) {
      const input = { UserName: name };
      const command = new CreateAccessKeyCommand(input);

      const { AccessKey } = await client.send(command);

      return {
        accessKeyId: AccessKey.AccessKeyId,
        secretAccessKey: AccessKey.SecretAccessKey,
      };
    },

    async updateSnowflakeRolePolicy(storageIntegration) {
      const input = {
        RoleName: SNOWFLAKE_ROLE_NAME,
        PolicyDocument: createUpdatedAssumeRolePolicyDocument(storageIntegration),
      };

      const command = new UpdateAssumeRolePolicyCommand(input);

      return client.send(command);
    },
  };
}

export default createIAMClient;
