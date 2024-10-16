import type { FromSchema } from 'json-schema-to-ts';

const queryDefinitionSchema = {
  type: 'object',
  properties: {
    // Length 1-255
    name: { type: 'string', minLength: 1, maxLength: 255 },
    // Length 1-10000
    query: { type: 'string', minLength: 1, maxLength: 10000 },
  },
  required: ['name', 'query'],
} as const;

const cloudwatchLogsInsightsSchema = {
  type: 'object',
  properties: {
    queries: {
      type: 'array',
      items: queryDefinitionSchema,
    },
  },
  required: ['queries'],
} as const;

const configSchema = {
  type: 'object',
  properties: {
    cloudwatchLogsInsights: cloudwatchLogsInsightsSchema,
  },
  required: ['cloudwatchLogsInsights'],
} as const;

export type CloudWatchLogsInsightsConfig = FromSchema<typeof configSchema>;

export { configSchema };
