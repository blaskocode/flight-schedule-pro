import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // PreSignUp Lambda function to auto-confirm users (skip email verification)
    const preSignUpFn = new lambda.Function(this, 'PreSignUpFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/functions/cognito-pre-signup'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'flight-schedule-pro-users',
      selfSignUpEnabled: true, // Enable user self-registration
      signInAliases: {
        email: true,
      },
      // Email verification disabled - PreSignUp Lambda will auto-confirm users
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change for production
      // Add PreSignUp trigger to auto-confirm users without email verification
      lambdaTriggers: {
        preSignUp: preSignUpFn,
      },
    });

    // User Pool Client
    const userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: 'flight-schedule-pro-web',
      generateSecret: false, // For web apps
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      // OAuth not needed for userPassword/userSrp flows
    });

    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClientId,
    });
  }
}

