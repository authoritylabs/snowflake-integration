import snowflake from 'snowflake-sdk';
import credentialHelper from './credentials.js';

const { getCredentials } = credentialHelper;

const STORAGE_INTEGRATION_NAME = 'SERPWOW_RESULTS_S3';

function getAuthOptions({ authMethod, password, privateKeyPath }) {
  if (authMethod === 'PASSWORD') {
    return {
      authenticator: 'SNOWFLAKE',
      password,
    };
  }

  if (authMethod === 'KEY_PAIR') {
    return {
      authenticator: 'SNOWFLAKE_JWT',
      privateKeyPath,
    };
  }

  throw new Error('Unsupported authentication method');
}

function createConnectionOptions(credentials) {
  const { account, username } = credentials;

  return {
    account,
    username,
    ...getAuthOptions(credentials),
  };
}

function connectToSnowflake() {
  const credentials = getCredentials().snowflake;
  const options = createConnectionOptions(credentials);

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(options);

    connection.connect((err, conn) => {
      if (err) {
        console.error(`Unable to connect: ${err.message}`);
        const { response } = err;

        if (response) {
          console.error(`Status: ${response.status} ${response.statusMessage}`);
        }

        reject(err);
        return;
      }

      resolve(conn);
    });
  });
}

async function createConnection() {
  const connection = await connectToSnowflake();

  return {
    close() {
      return new Promise((resolve) => {
        connection.destroy((err) => {
          if (err) {
            console.error('Error encountered when terminating Snowflake connection');
            resolve(false);
            return;
          }

          resolve(true);
        });
      });
    },

    execute(statement) {
      return new Promise((resolve, reject) => {
        connection.execute({
          sqlText: statement,
          complete: (err, stmt, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          },
        });
      });
    },
  };
}

async function createPipe(options) {
  const {
    database,
    schema,
    table,
    stage,
  } = options;

  const connection = await createConnection();
  const pipeName = `${database}.${schema}.SERPWOW_RESULTS_PIPE`;

  const statement = `CREATE PIPE ${pipeName}
  AUTO_INGEST = TRUE
  AS
  COPY INTO ${table.name}
  FROM (SELECT
    $1:result.search_parameters::OBJECT,
    $1:result.search_metadata.processed_at::DATE,
    $1:result.search_information::OBJECT,
    $1:result.related_searches::ARRAY,
    $1:result.related_questions::ARRAY,
    $1:result.organic_results::ARRAY,
    $1:result.answer_box::OBJECT,
    $1:result.ads::ARRAY,
    $1:result.local_results::ARRAY,
    $1:result.local_service_ads::ARRAY,
    $1:result.knowledge_graph::OBJECT,
    $1:result.top_carousel::ARRAY,
    $1:result.top_stories::ARRAY,
    $1:result.top_products::ARRAY,
    $1:result.inline_videos::ARRAY,
    $1:result.inline_images::ARRAY,
    $1:result.inline_shopping::ARRAY,
    $1:result.inline_tweets::ARRAY,
    $1:result.inline_podcasts::ARRAY,
    $1:result.inline_recipes::ARRAY
  FROM @${stage.name})
  ON_ERROR = CONTINUE`;

  await connection.execute(statement);
  const [pipe] = await connection.execute(`DESCRIBE PIPE ${pipeName}`);
  await connection.close();

  return { name: pipeName, notificationChannel: pipe?.notification_channel };
}

async function executeCreateIntegration(conn, { bucketName, roleArn }) {
  const statement = `CREATE STORAGE INTEGRATION ${STORAGE_INTEGRATION_NAME}
    TYPE = EXTERNAL_STAGE
    STORAGE_PROVIDER = 'S3'
    ENABLED = TRUE
    STORAGE_AWS_ROLE_ARN = '${roleArn}'
    STORAGE_ALLOWED_LOCATIONS = ('s3://${bucketName}/');`;

  return conn.execute(statement);
}

async function executeGetIntegration(conn) {
  const statement = `DESC INTEGRATION ${STORAGE_INTEGRATION_NAME}`;
  const props = await conn.execute(statement);
  const userArn = props.find(({ property }) => property === 'STORAGE_AWS_IAM_USER_ARN');
  const externalId = props.find(({ property }) => property === 'STORAGE_AWS_EXTERNAL_ID');

  return {
    name: STORAGE_INTEGRATION_NAME,
    awsUserArn: userArn?.property_value,
    awsExternalId: externalId?.property_value,
  };
}

async function createS3StorageIntegration(awsDetails) {
  const connection = await createConnection();

  const integration = await executeCreateIntegration(connection, awsDetails)
    .then(() => executeGetIntegration(connection))
    .catch(async (error) => {
      await connection.close();
      throw error;
    });

  await connection.close();

  return integration;
}

async function createStage(options) {
  const {
    database,
    schema,
    bucket,
    storageIntegration,
  } = options;

  const connection = await createConnection();
  const stageName = `${database}.${schema}.SERPWOW_RESULTS_S3_STAGE`;

  const statement = `CREATE STAGE ${stageName}
  URL = 's3://${bucket}'
  STORAGE_INTEGRATION = ${storageIntegration}
  FILE_FORMAT = (TYPE = JSON, STRIP_OUTER_ARRAY = TRUE);`;

  await connection.execute(statement);
  await connection.close();

  return { name: stageName };
}

async function createTable(database, schema) {
  const connection = await createConnection();
  const tableName = `${database}.${schema}.SERPWOW_RESULTS`;

  const statement = `CREATE TABLE ${tableName} (
    SEARCH_PARAMETERS  OBJECT,
    RANK_DATE          DATE    COMMENT 'search_metadata.processed_at',
    SEARCH_INFORMATION OBJECT,
    RELATED_SEARCHES   ARRAY,
    RELATED_QUESTIONS  ARRAY,
    ORGANIC_RESULTS    ARRAY,
    ANSWER_BOX         OBJECT,
    ADS                ARRAY,
    LOCAL_RESULTS      ARRAY,
    LOCAL_SERVICE_ADS  ARRAY,
    KNOWLEDGE_GRAPH    OBJECT,
    TOP_CAROUSEL       ARRAY,
    TOP_STORIES        ARRAY,
    TOP_PRODUCTS       ARRAY,
    INLINE_VIDEOS      ARRAY,
    INLINE_IMAGES      ARRAY,
    INLINE_SHOPPING    ARRAY,
    INLINE_TWEETS      ARRAY,
    INLINE_PODCASTS    ARRAY,
    INLINE_RECIPES     ARRAY
)`;

  await connection.execute(statement);
  await connection.close();

  return { name: tableName };
}

async function createView(database, schema, tableName) {
  const connection = await createConnection();
  const viewName = `${database}.${schema}.FLATTENED_SERPS`;

  const statement = `CREATE SECURE VIEW ${viewName}(
    RANK_DATE,
    KEYWORD,
    ENGINE,
    COUNTRY,
    LANGUAGE,
    LOCATION,
    DEVICE,
    SEARCH_ID,
    MESSAGE_TYPE,
    TITLE,
    DESCRIPTION,
    URL,
    DOMAIN,
    ESTIMATED_PAGE,
    POSITION
  )
  AS
  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'organic_results',
    organic.value:title::string,
    organic.value:snippet::string,
    organic.value:link::string,
    organic.value:domain::string,
    ceil(organic.value:position::integer / 10),
    organic.value:position::string
  FROM ${tableName}, LATERAL FLATTEN(INPUT => organic_results) AS organic

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'local_results',
    localpack.value:title::string,
    NULL,
    NULL,
    NULL,
    1,
    localpack.value:position::number
  FROM ${tableName}, LATERAL FLATTEN(INPUT => local_results) AS localpack

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'knowledge_graph',
    knowledge_graph:title::string,
    NULL,
    knowledge_graph:website::string,
    NULL,
    1,
    1
  FROM ${tableName} WHERE IS_OBJECT(knowledge_graph)

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'related_questions',
    related_question.value:question::string,
    NULL,
    NULL,
    NULL,
    1,
    related_question.index::number + 1
  FROM ${tableName}, LATERAL FLATTEN(INPUT => related_questions) AS related_question

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'related_searches',
    related_search.value:query::string,
    NULL,
    NULL,
    NULL,
    1,
    related_search.index::number + 1
  FROM ${tableName}, LATERAL FLATTEN(INPUT => related_searches) AS related_search

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'ads',
    ad.value:title::string,
    ad.value:description::string,
    ad.value:link::string,
    ad.value:domain::string,
    NULL,
    ad.value:position::integer
  FROM ${tableName}, LATERAL FLATTEN(INPUT => ads) AS ad

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'local_service_ads',
    local_service_ad.value:title::string,
    NULL,
    local_service_ad.value:link::string,
    NULL,
    1,
    local_service_ad.value:position::integer
  FROM ${tableName}, LATERAL FLATTEN(INPUT => local_service_ads) AS local_service_ad

  UNION ALL

  SELECT
    rank_date::date,
    search_parameters:q::string,
    search_parameters:engine::string,
    search_parameters:gl::string,
    search_parameters:hl::string,
    search_parameters:location::string,
    IFNULL(search_parameters:device::string, 'desktop'),
    search_parameters:custom_id::string,
    'inline_shopping',
    inline_shopping.value:title::string,
    inline_shopping.value:merchant::string,
    inline_shopping.value:link::string,
    NULL,
    NULL,
    inline_shopping.value:position::integer
  FROM ${tableName}, LATERAL FLATTEN(INPUT => inline_shopping) AS inline_shopping`;

  await connection.execute(statement);
  await connection.close();

  return { name: viewName };
}

async function testCredentials() {
  console.log('Establishing connection...');
  const connection = await createConnection();
  await connection.close();

  return true;
}

export default {
  createPipe,
  createS3StorageIntegration,
  createStage,
  createTable,
  createView,
  testCredentials,
};
