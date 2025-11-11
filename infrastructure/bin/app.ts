#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { SecretsStack } from '../lib/secrets-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

// Get environment from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Database Stack (VPC, RDS, Redis)
const databaseStack = new DatabaseStack(app, 'FlightSchedulePro-Database', {
  env,
});

// Secrets Stack (API keys)
const secretsStack = new SecretsStack(app, 'FlightSchedulePro-Secrets', {
  env,
});

// Auth Stack (Cognito)
const authStack = new AuthStack(app, 'FlightSchedulePro-Auth', {
  env,
});

// API Stack (API Gateway, Lambda, EventBridge)
const apiStack = new ApiStack(app, 'FlightSchedulePro-Api', {
  env,
  vpc: databaseStack.vpc,
  database: databaseStack.database,
  databaseSecret: databaseStack.databaseSecret,
  redisEndpoint: databaseStack.redisEndpoint,
  lambdaSecurityGroup: databaseStack.lambdaSecurityGroup,
  userPool: authStack.userPool,
  secrets: secretsStack,
});

// Frontend Stack (S3, CloudFront)
const frontendStack = new FrontendStack(app, 'FlightSchedulePro-Frontend', {
  env,
  apiUrl: apiStack.apiUrl,
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
});

// Stack dependencies
apiStack.addDependency(databaseStack);
apiStack.addDependency(secretsStack);
apiStack.addDependency(authStack);
frontendStack.addDependency(apiStack);
frontendStack.addDependency(authStack);

