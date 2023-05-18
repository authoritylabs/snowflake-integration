import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';

function createS3Client(credentials) {
  const client = new S3Client({ credentials });

  return {
    async createBucket(name) {
      const input = { Bucket: name };
      const command = new CreateBucketCommand(input);

      await client
        .send(command)
        .catch((error) => {
          throw new Error(`Failed to create bucket: ${error.message}`);
        });

      return true;
    },
  };
}

export default createS3Client;
