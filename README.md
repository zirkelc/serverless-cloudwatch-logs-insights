# Serverless CloudWatch Logs Insights Plugin

[![CI](https://github.com/zirkelc/serverless-cloudwatch-logs-insights/actions/workflows/ci.yml/badge.svg)](https://github.com/zirkelc/serverless-cloudwatch-logs-insights/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/serverless-cloudwatch-logs-insights-plugin)](https://www.npmjs.com/package/serverless-cloudwatch-logs-insights-plugin)
[![npm](https://img.shields.io/npm/dt/serverless-cloudwatch-logs-insights-plugin)](https://www.npmjs.com/package/serverless-cloudwatch-logs-insights-plugin)

This Serverless Framework plugin automatically creates CloudWatch Logs Insights queries for all Lambda functions in your service.

## Installation

Install the plugin as a dev dependency in your Serverless project:

```bash
npm install --save-dev serverless-cloudwatch-logs-insights-plugin
```

## Usage

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-cloudwatch-logs-insights-plugin
```

Configure your queries in the `custom` section of your `serverless.yml`:

```yaml
custom:
  cloudwatchLogsInsights:
    queries:
      - name: "ErrorLogs"
        query: "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
      - name: "WarningLogs"
        query: "fields @timestamp, @message | filter @message like /WARNING/ | sort @timestamp desc | limit 20"
      - name: "RecentLogs"
        query: "fields @timestamp, @message | sort @timestamp desc | limit 50"
```

## Configuration

The plugin configuration is placed under the `custom.cloudwatchLogsInsights` key in your `serverless.yml` file.

### Options

- `queries`: An array of query definitions. Each query definition should have:
  - `name`: A unique name for the query (required). You can use forward slashes to create folder structure for your queries. For example, `folder-name/query-name`.
  - `query`: The CloudWatch Logs Insights query string (required). For example: `fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20`

## How It Works

1. The plugin collects all Lambda functions defined in your Serverless service.
2. It creates a CloudFormation resource of type `AWS::CloudWatch::QueryDefinition` for each configured query.
3. Each query includes all Lambda function log groups.

## Example

Here's a full example of a `serverless.yml` file using this plugin:

```yaml
service: my-service

plugins:
  - serverless-cloudwatch-logs-insights-plugin

provider:
  name: aws
  runtime: nodejs14.x

functions:
  hello:
    handler: handler.hello
  world:
    handler: handler.world

custom:
  cloudwatchLogsInsights:
    queries:
      - name: "ErrorLogs"
        query: "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
      - name: "WarningLogs"
        query: "fields @timestamp, @message | filter @message like /WARNING/ | sort @timestamp desc | limit 20"
      - name: "RecentLogs"
        query: "fields @timestamp, @message | sort @timestamp desc | limit 50"
```

This configuration will create three CloudWatch Logs Insights queries, each including both the `hello` and `world` function log groups.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
