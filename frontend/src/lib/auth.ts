'use client';

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Validate environment variables
const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

if (!userPoolId || !clientId) {
  console.error('Missing Cognito configuration. Please set the following environment variables:');
  console.error('  NEXT_PUBLIC_USER_POOL_ID');
  console.error('  NEXT_PUBLIC_USER_POOL_CLIENT_ID');
  console.error('\nTo get these values:');
  console.error('  1. Deploy the Auth stack: cd infrastructure && cdk deploy FlightSchedulePro-Auth');
  console.error('  2. Get the outputs: aws cloudformation describe-stacks --stack-name FlightSchedulePro-Auth --query "Stacks[0].Outputs"');
  console.error('  3. Create frontend/.env.local with the values');
}

const poolData = {
  UserPoolId: userPoolId || '',
  ClientId: clientId || '',
};

const userPool = new CognitoUserPool(poolData);

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export function signUp(data: SignUpData): Promise<AuthTokens> {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: data.email }),
      new CognitoUserAttribute({ Name: 'given_name', Value: data.firstName }),
      new CognitoUserAttribute({ Name: 'family_name', Value: data.lastName }),
    ];

    userPool.signUp(
      data.email,
      data.password,
      attributeList,
      [],
      async (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        // Automatically sign in the user after successful signup
        // Retry with exponential backoff in case Cognito needs a moment to make user available
        let retries = 3;
        let delay = 500; // Start with 500ms delay
        
        while (retries > 0) {
          try {
            // Small delay before first attempt to allow Cognito to process
            await new Promise(resolve => setTimeout(resolve, delay));
            const tokens = await signIn(data.email, data.password);
            resolve(tokens);
            return;
          } catch (signInErr: any) {
            retries--;
            if (retries === 0) {
              // If all retries fail, reject with the error
              reject(signInErr);
              return;
            }
            // Exponential backoff: 500ms, 1000ms, 2000ms
            delay *= 2;
          }
        }
      }
    );
  });
}

export function signIn(email: string, password: string): Promise<AuthTokens> {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

export function signOut(): Promise<void> {
  return new Promise((resolve) => {
    const cognitoUser = getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    resolve();
  });
}

export function getCurrentUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

export function getSession(): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCurrentUser();
    if (!cognitoUser) {
      reject(new Error('No user logged in'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('No session'));
        return;
      }
      resolve(session);
    });
  });
}

export function getIdToken(): Promise<string> {
  return getSession().then((session) => session.getIdToken().getJwtToken());
}

