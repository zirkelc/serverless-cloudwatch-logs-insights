import type Serverless from 'serverless';
import type Plugin from 'serverless/classes/Plugin';
import type { Logging } from 'serverless/classes/Plugin';
import { type CloudWatchLogsInsightsConfig, configSchema } from './config';

class ServerlessCloudWatchLogsInsightsPlugin implements Plugin {
  serverless: Serverless;
  cliOptions: Serverless.Options;
  hooks: Plugin.Hooks;
  logging: Logging;
  config: CloudWatchLogsInsightsConfig;

  constructor(
    serverless: Serverless,
    cliOptions: Serverless.Options,
    logging: Logging,
  ) {
    this.serverless = serverless;
    this.cliOptions = cliOptions || {};
    this.logging = logging;
    this.config = { cloudwatchLogsInsights: { queries: [] } };

    this.hooks = {
      initialize: () => this.init(),
      'package:compileEvents': async () =>
        this.addCloudWatchLogsInsightsQueries(),
    };

    serverless.configSchemaHandler.defineCustomProperties(configSchema);
  }

  init() {
    this.config = this.serverless.service
      .custom as CloudWatchLogsInsightsConfig;
  }

  async addCloudWatchLogsInsightsQueries() {
    if (
      !this.config.cloudwatchLogsInsights.queries ||
      this.config.cloudwatchLogsInsights.queries.length === 0
    ) {
      this.logging.log.notice(
        'No CloudWatch Logs Insights queries configured. Skipping query generation.',
      );
      return;
    }

    const aws = this.serverless.getProvider('aws');
    const functions = this.serverless.service.getAllFunctions();
    const template =
      this.serverless.service.provider.compiledCloudFormationTemplate;

    const logGroupNames = new Array<string>();
    const logGroupLogicalIds = new Array<string>();

    for (const functionName of functions) {
      const logicalId = aws.naming.getLambdaLogicalId(functionName);
      const functionResource = template.Resources[logicalId];

      if (
        functionResource &&
        functionResource.Type === 'AWS::Lambda::Function'
      ) {
        const logGroupName = `/aws/lambda/${functionResource.Properties.FunctionName}`;
        logGroupNames.push(logGroupName);

        const logGroupLogicalId = aws.naming.getLogGroupLogicalId(functionName);
        logGroupLogicalIds.push(logGroupLogicalId);
      }
    }

    if (logGroupNames.length > 0) {
      this.config.cloudwatchLogsInsights.queries.forEach((queryDef, index) => {
        const queryLogicalId = `LogsInsightsQuery${index}`;
        template.Resources[queryLogicalId] = {
          Type: 'AWS::Logs::QueryDefinition',
          Properties: {
            Name: queryDef.name,
            QueryString: queryDef.query,
            LogGroupNames: logGroupNames,
          },
          DependsOn: logGroupLogicalIds,
        };

        this.logging.log.verbose(
          `Added CloudWatch Logs Insights query: ${queryDef.name}`,
        );
      });

      this.logging.log.success(
        'Added CloudWatch Logs Insights queries to CloudFormation template',
      );
    } else {
      this.logging.log.notice(
        'No Lambda functions found. Skipping CloudWatch Logs Insights query generation.',
      );
    }
  }
}

// use default export syntax because Serverless expects that
export = ServerlessCloudWatchLogsInsightsPlugin;
