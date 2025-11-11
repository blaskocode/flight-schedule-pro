import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'flight-schedule-pro-users',
      selfSignUpEnabled: true, // Enable user self-registration
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change for production
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

