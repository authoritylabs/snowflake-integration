# snowflake-integration
Scripts to setup auto-ingestion pipeline between SerpWow and Snowflake

## Run Application

### Install

```
npm install -g .
```

### Start

```
serp2snow
```

## Prerequisites

The integration setup will prompt for the following details:
- AWS account id
- AWS access key id and secret for authorized IAM user
- SerpWow API key
- Snowflake account identifier (see [format docs](https://docs.snowflake.com/en/user-guide/admin-account-identifier))
- Snowflake username and password
- The bucket name where SerpWow result data will be staged
- The names of the existing Snowflake database and schema where the results will be stored


### Snowflake Privileges

The Snowflake user for the provided credentials will need the following privileges:

- CREATE INTEGRATION ON ACCOUNT
- USAGE ON DATABASE <DATABASE_NAME>
- USAGE ON SCHEMA <SCHEMA_NAME>
- CREATE PIPE ON SCHEMA <SCHEMA_NAME>
- CREATE STAGE ON SCHEMA <SCHEMA_NAME>
- CREATE TABLE ON SCHEMA <SCHEMA_NAME>

### AWS IAM Permissions

The AWS IAM user for the provided access key will need the following permissions (replace `<aws-account>` and `<bucket-name>` with respective input values):

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SerpWowWriteAccess",
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicy",
        "iam:AttachUserPolicy",
        "iam:CreateUser",
        "iam:CreateAccessKey"
      ],
      "Resource": [
        "arn:aws:iam::<aws-account>:policy/serpwow_results_write_to_s3",
        "arn:aws:iam::<aws-account>:user/serpwow_results_upload_user"
      ]
    },
    {
      "Sid": "SnowflakeReadAccess",
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicy",
        "iam:UpdateAssumeRolePolicy",
        "iam:CreateRole",
        "iam:AttachRolePolicy"
      ],
      "Resource": [
        "arn:aws:iam::<aws-account>:role/serpwow_integration_snowflake_external",
        "arn:aws:iam::<aws-account>:policy/serpwow_results_snowflake_access"
      ]
    },
    {
      "Sid": "S3BucketCreate",
      "Effect": "Allow",
      "Action": [
        "s3:PutBucketNotification",
        "s3:CreateBucket"
      ],
      "Resource": "arn:aws:s3:::<bucket-name>"
    }
  ]
}
```

### Integration Output

Running `Setup SerpWow to Snowflake integration` option will create the following resources:

* AWS S3 bucket of the provided bucket name
* AWS IAM user "serpwow_results_upload_user"
* AWS IAM role "serpwow_integration_snowflake_external"
* AWS IAM policy "serpwow_results_write_to_s3"
* AWS IAM policy "serpwow_results_snowflake_access"
* SerpWow destination named "SNOWFLAKE_S3_INTEGRATION"
* Snowflake storage integration named "SERPWOW_RESULTS_S3"
* Snowflake table named "SERPWOW_RESULTS"
* Snowflake stage named "SERPWOW_RESULTS_S3_STAGE"
* Snowflake pipe named "SERPWOW_RESULTS_PIPE"
