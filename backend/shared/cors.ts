import { APIGatewayProxyEvent } from 'aws-lambda';

// CloudFront origin - should match API Gateway CORS config
// When allowCredentials is true, we must return the exact origin (not wildcard)
const CLOUDFRONT_ORIGIN = process.env.CLOUDFRONT_ORIGIN || 'https://db62n67tl6hkc.cloudfront.net';

/**
 * Get CORS headers for API Gateway responses
 * When allowCredentials is true, we must return the exact origin (not wildcard)
 */
export function getCorsHeaders(event: APIGatewayProxyEvent) {
  // Get origin from request headers, validate against allowed origins
  const requestOrigin = event.headers.Origin || event.headers.origin;
  // Use CloudFront origin (must match API Gateway CORS config)
  const allowedOrigin = requestOrigin === CLOUDFRONT_ORIGIN ? requestOrigin : CLOUDFRONT_ORIGIN;
  
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

