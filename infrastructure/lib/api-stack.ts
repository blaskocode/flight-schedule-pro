import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { SecretsStack } from './secrets-stack';

export interface ApiStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  databaseSecret: secretsmanager.ISecret;
  redisEndpoint: string;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  secrets: SecretsStack;
  frontendOrigin?: string; // Optional CloudFront origin URL for CORS
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { vpc, database, databaseSecret, redisEndpoint, lambdaSecurityGroup, userPool, secrets } = props;

    // Lambda Layer (shared dependencies)
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('../backend/layers/shared/layer.zip'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared dependencies: Prisma, AWS SDK, OpenAI',
    });

    // Note: We'll grant secret access to each Lambda function individually below

    // Common environment variables
    // DATABASE_URL will be constructed at runtime from secret
    // For now, we'll pass the secret ARN and Lambda will fetch it
    const environment: { [key: string]: string } = {
      DATABASE_SECRET_ARN: databaseSecret.secretArn,
      DATABASE_HOST: database.instanceEndpoint.hostname,
      DATABASE_NAME: 'flightschedule',
      DATABASE_USER: 'postgres',
      REDIS_ENDPOINT: redisEndpoint,
      REDIS_PORT: '6379',
      // Note: AWS_REGION is automatically available in Lambda runtime, don't set it
      FROM_EMAIL: 'noreply@flightschedulepro.com',
      WEATHER_PROVIDER: 'weatherapi',
    };

    // Common Lambda configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [sharedLayer],
      environment,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    };

    // Weather Check Lambda
    const weatherCheckFn = new lambdaNodejs.NodejsFunction(this, 'WeatherCheckFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/weather/check/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Flights List Lambda
    const flightsListFn = new lambdaNodejs.NodejsFunction(this, 'FlightsListFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/flights/list/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Flights Create Lambda
    const flightsCreateFn = new lambdaNodejs.NodejsFunction(this, 'FlightsCreateFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/flights/create/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Students List Lambda
    const studentsListFn = new lambdaNodejs.NodejsFunction(this, 'StudentsListFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/students/list/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Instructors List Lambda
    const instructorsListFn = new lambdaNodejs.NodejsFunction(this, 'InstructorsListFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/instructors/list/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Aircraft List Lambda
    const aircraftListFn = new lambdaNodejs.NodejsFunction(this, 'AircraftListFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/aircraft/list/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Schools List Lambda
    const schoolsListFn = new lambdaNodejs.NodejsFunction(this, 'SchoolsListFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/schools/list/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Weather Forecast Lambda
    const weatherForecastFn = new lambdaNodejs.NodejsFunction(this, 'WeatherForecastFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/weather/forecast/index.ts',
      environment: {
        ...environment,
        WEATHER_API_SECRET_ARN: secrets.weatherApiSecret.secretArn,
      },
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Weather Briefing Lambda
    const weatherBriefingFn = new lambdaNodejs.NodejsFunction(this, 'WeatherBriefingFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/weather/briefing/index.ts',
      environment: {
        ...environment,
        WEATHER_API_SECRET_ARN: secrets.weatherApiSecret.secretArn,
      },
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // API Info Lambda (root endpoint - no VPC needed, no auth)
    const apiInfoFn = new lambdaNodejs.NodejsFunction(this, 'ApiInfoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../backend/functions/api-info/index.js',
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // AI Reschedule Generate Lambda (needs more memory and OpenAI secret)
    const aiRescheduleFn = new lambdaNodejs.NodejsFunction(this, 'AIRescheduleFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/reschedule/generate-options/index.ts',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...environment,
        OPENAI_SECRET_ARN: secrets.openaiSecret.secretArn,
      },
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser', 'ai', '@ai-sdk/openai', 'zod'],
      },
    });

    // Reschedule Select Option Lambda
    const rescheduleSelectFn = new lambdaNodejs.NodejsFunction(this, 'RescheduleSelectFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/reschedule/select-option/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Reschedule Approve Lambda
    const rescheduleApproveFn = new lambdaNodejs.NodejsFunction(this, 'RescheduleApproveFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/reschedule/approve-reschedule/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Hourly Weather Check Job Lambda
    const hourlyWeatherCheckFn = new lambdaNodejs.NodejsFunction(this, 'HourlyWeatherCheckFunction', {
      ...lambdaConfig,
      entry: '../backend/functions/jobs/hourly-weather-check/index.ts',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        ...environment,
        OPENAI_SECRET_ARN: secrets.openaiSecret.secretArn,
        WEATHER_API_SECRET_ARN: secrets.weatherApiSecret.secretArn,
      },
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser', 'ai', '@ai-sdk/openai', 'zod'],
      },
    });

    // Admin: Migration Lambda (for running Prisma migrations)
    const migrateFn = new lambdaNodejs.NodejsFunction(this, 'MigrateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [sharedLayer],
      environment,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      entry: '../backend/functions/admin/migrate/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Admin: Seed Lambda (for seeding database)
    const seedFn = new lambdaNodejs.NodejsFunction(this, 'SeedFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [sharedLayer],
      environment,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      entry: '../backend/functions/admin/seed/index.ts',
      bundling: {
        externalModules: ['@prisma/client', '@aws-sdk', 'metar-taf-parser'],
      },
    });

    // Grant secrets access
    databaseSecret.grantRead(weatherCheckFn);
    databaseSecret.grantRead(flightsListFn);
    databaseSecret.grantRead(flightsCreateFn);
    databaseSecret.grantRead(aiRescheduleFn);
    databaseSecret.grantRead(rescheduleSelectFn);
    databaseSecret.grantRead(rescheduleApproveFn);
    databaseSecret.grantRead(hourlyWeatherCheckFn);
    databaseSecret.grantRead(migrateFn);
    databaseSecret.grantRead(seedFn);
    databaseSecret.grantRead(studentsListFn);
    databaseSecret.grantRead(instructorsListFn);
    databaseSecret.grantRead(aircraftListFn);
    databaseSecret.grantRead(schoolsListFn);
    databaseSecret.grantRead(weatherForecastFn);
    databaseSecret.grantRead(weatherBriefingFn);
    
    secrets.openaiSecret.grantRead(aiRescheduleFn);
    secrets.openaiSecret.grantRead(hourlyWeatherCheckFn);
    secrets.weatherApiSecret.grantRead(hourlyWeatherCheckFn);
    secrets.weatherApiSecret.grantRead(weatherForecastFn);
    secrets.weatherApiSecret.grantRead(weatherBriefingFn);

    // Grant SES permissions for email notifications
    const sesPolicy = new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    });

    weatherCheckFn.addToRolePolicy(sesPolicy);
    hourlyWeatherCheckFn.addToRolePolicy(sesPolicy);
    rescheduleSelectFn.addToRolePolicy(sesPolicy);
    rescheduleApproveFn.addToRolePolicy(sesPolicy);
    aiRescheduleFn.addToRolePolicy(sesPolicy);
    weatherBriefingFn.addToRolePolicy(sesPolicy);

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Determine allowed origins for CORS
    // When allowCredentials is true, we cannot use ALL_ORIGINS
    // We need to specify the exact origin(s)
    // Priority: 1) frontendOrigin prop, 2) context variable, 3) Try to import from FrontendStack (with fallback)
    let allowedOrigins: string[];
    
    if (props.frontendOrigin) {
      // Use explicitly provided origin
      allowedOrigins = [props.frontendOrigin];
    } else {
      // Try to get from context (can be set via: cdk deploy --context frontendOrigin=https://...)
      const contextOrigin = this.node.tryGetContext('frontendOrigin');
      if (contextOrigin) {
        allowedOrigins = [contextOrigin];
      } else {
        // Try to import from FrontendStack export (if frontend is already deployed)
        // Note: cdk.Fn.importValue() will fail at synthesis if export doesn't exist
        // So we use a conditional approach: try to import, but provide a sensible default
        // The export may not exist if frontend stack hasn't been deployed yet
        // In that case, we'll use a known CloudFront URL or allow the user to provide it via context
        // IMPORTANT: If you get "No export named FSP-FrontendOrigin found", provide origin via:
        // cdk deploy FlightSchedulePro-Api --context frontendOrigin=https://your-cloudfront-url.cloudfront.net
        const frontendOrigin = cdk.Fn.importValue('FSP-FrontendOrigin');
        allowedOrigins = [frontendOrigin];
      }
    }

    // API Gateway
    this.api = new apigateway.RestApi(this, 'FSP-API', {
      restApiName: 'Flight Schedule Pro API',
      description: 'API for Flight Schedule Pro',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: true,
      },
    });

    // Root endpoint (API info - no auth required)
    this.api.root.addMethod(
      'GET',
      new apigateway.LambdaIntegration(apiInfoFn)
    );

    // Define API routes
    const weather = this.api.root.addResource('weather');
    weather.addResource('check').addMethod(
      'POST',
      new apigateway.LambdaIntegration(weatherCheckFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
    weather.addResource('forecast').addResource('{airport}').addMethod(
      'GET',
      new apigateway.LambdaIntegration(weatherForecastFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
    weather.addResource('briefing').addResource('{flightId}').addMethod(
      'GET',
      new apigateway.LambdaIntegration(weatherBriefingFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const flights = this.api.root.addResource('flights');
    flights.addMethod(
      'GET',
      new apigateway.LambdaIntegration(flightsListFn, {
        proxy: true, // Use proxy mode - Lambda returns full response including headers
      }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
    flights.addMethod(
      'POST',
      new apigateway.LambdaIntegration(flightsCreateFn, {
        proxy: true, // Use proxy mode - Lambda returns full response including headers
      }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const reschedule = this.api.root.addResource('reschedule');
    reschedule.addResource('generate').addMethod(
      'POST',
      new apigateway.LambdaIntegration(aiRescheduleFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
    reschedule.addResource('select').addMethod(
      'POST',
      new apigateway.LambdaIntegration(rescheduleSelectFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
    reschedule.addResource('approve').addMethod(
      'POST',
      new apigateway.LambdaIntegration(rescheduleApproveFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Resource list endpoints
    const students = this.api.root.addResource('students');
    students.addMethod(
      'GET',
      new apigateway.LambdaIntegration(studentsListFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const instructors = this.api.root.addResource('instructors');
    instructors.addMethod(
      'GET',
      new apigateway.LambdaIntegration(instructorsListFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const aircraft = this.api.root.addResource('aircraft');
    aircraft.addMethod(
      'GET',
      new apigateway.LambdaIntegration(aircraftListFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const schools = this.api.root.addResource('schools');
    schools.addMethod(
      'GET',
      new apigateway.LambdaIntegration(schoolsListFn, { proxy: true }),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Admin endpoints (no auth for initial setup - can be secured later)
    const admin = this.api.root.addResource('admin');
    admin.addResource('migrate').addMethod(
      'POST',
      new apigateway.LambdaIntegration(migrateFn)
      // Note: No auth for admin endpoints - consider adding API key or IP restriction for production
    );
    admin.addResource('seed').addMethod(
      'POST',
      new apigateway.LambdaIntegration(seedFn)
      // Note: No auth for admin endpoints - consider adding API key or IP restriction for production
    );

    // EventBridge Rule (Hourly Weather Check)
    const hourlyRule = new events.Rule(this, 'HourlyWeatherCheckRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      description: 'Trigger weather check job every hour',
    });
    hourlyRule.addTarget(new targets.LambdaFunction(hourlyWeatherCheckFn));

    // Grant EventBridge permission to invoke Lambda
    hourlyWeatherCheckFn.addPermission('AllowEventBridge', {
      principal: new iam.ServicePrincipal('events.amazonaws.com'),
      sourceArn: hourlyRule.ruleArn,
    });

    this.apiUrl = this.api.url;

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      exportName: 'FSP-ApiUrl',
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      exportName: 'FSP-ApiId',
    });
  }
}
