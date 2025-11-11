import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // S3 bucket for static hosting
    // Note: We don't enable website hosting because CloudFront uses REST endpoint with OAI
    const bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `flight-schedule-pro-frontend-${this.account}-${this.region}`,
      publicReadAccess: false, // CloudFront will handle access via OAI
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change for production
      autoDeleteObjects: true, // For easier cleanup
    });

    // Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for Flight Schedule Pro frontend',
    });

    // Grant CloudFront read access to bucket
    bucket.grantRead(originAccessIdentity);

    // CloudFront Function to handle SPA routing
    const rewriteFunction = new cloudfront.Function(this, 'RewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // If the URI ends with a slash, try to serve index.html from that directory
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    }
    // If the URI doesn't have an extension, try to serve it as a directory with index.html
    else if (!uri.includes('.')) {
        request.uri = uri + '/index.html';
    }
    
    return request;
}
      `.trim()),
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    const distributionUrl = `https://${distribution.distributionDomainName}`;
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: distributionUrl,
    });

    // Export CloudFront URL for API stack CORS configuration
    new cdk.CfnOutput(this, 'FrontendOrigin', {
      value: distributionUrl,
      exportName: 'FSP-FrontendOrigin',
      description: 'CloudFront distribution URL for CORS configuration',
    });
  }
}

