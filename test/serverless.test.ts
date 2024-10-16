import fs from 'node:fs';
import path from 'node:path';
import { LocalstackContainer } from '@testcontainers/localstack';
import { $ } from 'execa';
import { beforeEach, describe, expect, test } from 'vitest';
import { beforeAll } from 'vitest';

const CONFIG_FILE = path.join(__dirname, '..', 'serverless.yml');
const SERVERLESS_DIR = path.join(__dirname, '..', '.serverless');
const CLOUDFORMATION_TEMPLATE_FILE = path.join(
  SERVERLESS_DIR,
  'cloudformation-template-update-stack.json',
);

const readCloudformationTemplate = () => {
  return JSON.parse(fs.readFileSync(CLOUDFORMATION_TEMPLATE_FILE, 'utf-8'));
};

const removeServerlessDir = () => {
  if (fs.existsSync(SERVERLESS_DIR)) {
    fs.rmSync(SERVERLESS_DIR, { recursive: true });
  }
};

// TODO figure out why this is not working
// Error while creating lambda: Docker not available
// beforeAll(async () => {
//   const localstack = await new LocalstackContainer(
//     'localstack/localstack:3',
//   ).start();

//   // https://www.serverless.com/plugins/serverless-localstack#configuration-via-environment-variables
//   process.env.AWS_ENDPOINT_URL = localstack.getConnectionUri();
//   process.env.AWS_ACCESS_KEY_ID = 'test';
//   process.env.AWS_SECRET_ACCESS_KEY = 'test';
//   process.env.AWS_REGION = 'us-east-1';
//   process.env.LAMBDA_EXECUTOR = 'docker';
// }, 50_000);

describe('should generate CloudWatch Logs Insights queries for all functions', () => {
  beforeEach(() => removeServerlessDir());

  test.each(['deploy', 'package'])('serverless %s', async (command) => {
    const result = await $`sls ${command} --config ${CONFIG_FILE}`;
    expect(result.exitCode).toBe(0);

    console.log(result.stdout, result.stderr, result.exitCode);

    const template = readCloudformationTemplate();
    const queryLogicalIds = Object.keys(template.Resources).filter((key) =>
      key.startsWith('LogsInsightsQuery'),
    );
    expect(queryLogicalIds).toHaveLength(3);

    const queryLogicalId0 = queryLogicalIds[0];
    const queryLogicalId1 = queryLogicalIds[1];
    const queryLogicalId2 = queryLogicalIds[2];
    expect(queryLogicalId0).toEqual('LogsInsightsQuery0');
    expect(queryLogicalId1).toEqual('LogsInsightsQuery1');
    expect(queryLogicalId2).toEqual('LogsInsightsQuery2');

    const query0 = template.Resources[queryLogicalId0];
    const query1 = template.Resources[queryLogicalId1];
    const query2 = template.Resources[queryLogicalId2];

    expect(query0).toEqual({
      Type: 'AWS::Logs::QueryDefinition',
      Properties: {
        LogGroupNames: [
          '/aws/lambda/acme-service-dev-foo',
          '/aws/lambda/acme-service-dev-bar',
        ],
        Name: 'ErrorLogs',
        QueryString:
          'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20',
      },
      DependsOn: ['FooLogGroup', 'BarLogGroup'],
    });

    expect(query1).toEqual({
      Type: 'AWS::Logs::QueryDefinition',
      Properties: {
        LogGroupNames: [
          '/aws/lambda/acme-service-dev-foo',
          '/aws/lambda/acme-service-dev-bar',
        ],
        Name: 'WarningLogs',
        QueryString:
          'fields @timestamp, @message | filter @message like /WARNING/ | sort @timestamp desc | limit 20',
      },
      DependsOn: ['FooLogGroup', 'BarLogGroup'],
    });

    expect(query2).toEqual({
      Type: 'AWS::Logs::QueryDefinition',
      Properties: {
        LogGroupNames: [
          '/aws/lambda/acme-service-dev-foo',
          '/aws/lambda/acme-service-dev-bar',
        ],
        Name: 'RecentLogs',
        QueryString:
          'fields @timestamp, @message | sort @timestamp desc | limit 50',
      },
      DependsOn: ['FooLogGroup', 'BarLogGroup'],
    });
  });
});
