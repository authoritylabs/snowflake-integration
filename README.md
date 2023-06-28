# snowflake-integration
Console application to setup auto-ingestion pipeline between VALUE SERP batches and Snowflake.

VALUE SERP sends SERP data to AWS S3 which is piped to Snowflake through the concepts in [this article](https://docs.snowflake.com/en/user-guide/data-load-snowpipe-auto-s3#option-1-creating-a-new-s3-event-notification-to-automate-snowpipe). A custom view is created to represent flattened SERP results as individual rows.

## Installation and Usage

Prerequisites: [Node.js](https://nodejs.org/) v14.0.0 or greater

Clone this repository and install the application as a global NPM package:
```
git clone git@github.com:authoritylabs/snowflake-integration.git
cd snowflake-integration.git
npm install -g .
```

Start the console application:

```
serp2snow
```

Alternatively, you can start the application from the project root by running with Node:
```
node .
```

## Required Information and Permissions

The integration setup will prompt for the following details:
- AWS account id
- AWS access key id and secret for authorized IAM user
- VALUE SERP API key
- Snowflake account identifier (see [format docs](https://docs.snowflake.com/en/user-guide/admin-account-identifier))
- Snowflake username and password
- The bucket name where VALUE SERP result data will be staged
- The names of the existing Snowflake database and schema where the results will be stored


### Snowflake Privileges

The Snowflake user for the provided credentials will need the following privileges:

- CREATE INTEGRATION ON ACCOUNT
- USAGE ON DATABASE <DATABASE_NAME>
- USAGE ON SCHEMA <SCHEMA_NAME>
- CREATE PIPE ON SCHEMA <SCHEMA_NAME>
- CREATE STAGE ON SCHEMA <SCHEMA_NAME>
- CREATE TABLE ON SCHEMA <SCHEMA_NAME>
- CREATE VIEW ON SCHEMA <SCHEMA_NAME>

### AWS IAM Permissions

The AWS IAM user for the provided access key will need the following permissions (replace `<aws-account>` and `<bucket-name>` with respective input values):

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ValueSerpWriteAccess",
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicy",
        "iam:AttachUserPolicy",
        "iam:CreateUser",
        "iam:CreateAccessKey"
      ],
      "Resource": [
        "arn:aws:iam::<aws-account>:policy/valueserp_results_write_to_s3",
        "arn:aws:iam::<aws-account>:user/valueserp_results_upload_user"
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
        "arn:aws:iam::<aws-account>:role/valueserp_integration_snowflake_external",
        "arn:aws:iam::<aws-account>:policy/valueserp_results_snowflake_access"
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

Running `Setup VALUE SERP to Snowflake integration` option will create the following resources:

* AWS S3 bucket of the provided bucket name
* AWS IAM user "valueserp_results_upload_user"
* AWS IAM role "valueserp_integration_snowflake_external"
* AWS IAM policy "valueserp_results_write_to_s3"
* AWS IAM policy "valueserp_results_snowflake_access"
* VALUE SERP destination named "SNOWFLAKE_S3_INTEGRATION"
* Snowflake storage integration named "VALUESERP_RESULTS_S3"
* Snowflake table named "VALUESERP_RESULTS"
* Snowflake stage named "VALUESERP_RESULTS_S3_STAGE"
* Snowflake pipe named "VALUESERP_RESULTS_PIPE"
* Snowflake view named "FLATTENED_SERPS"

### Post-Setup Instructions

* Be sure to grant SELECT privileges to any user or role that will access the created Snowflake view.
* The view will automatically populate with SERP data from any VALUE SERP Batch result set that references the created Destination using the JSON format.
