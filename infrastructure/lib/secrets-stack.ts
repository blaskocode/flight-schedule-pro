import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SecretsStack extends cdk.Stack {
  public readonly openaiSecret: secretsmanager.ISecret;
  public readonly weatherApiSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // OpenAI API Key Secret
    this.openaiSecret = new secretsmanager.Secret(this, 'OpenAISecret', {
      description: 'OpenAI API key for AI rescheduling',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ apiKey: 'placeholder' }),
        generateStringKey: 'apiKey',
      },
    });

    // WeatherAPI.com Secret
    this.weatherApiSecret = new secretsmanager.Secret(this, 'WeatherApiSecret', {
      description: 'WeatherAPI.com API key',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ apiKey: 'placeholder' }),
        generateStringKey: 'apiKey',
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'OpenAISecretArn', {
      value: this.openaiSecret.secretArn,
    });

    new cdk.CfnOutput(this, 'WeatherApiSecretArn', {
      value: this.weatherApiSecret.secretArn,
    });
  }
}

