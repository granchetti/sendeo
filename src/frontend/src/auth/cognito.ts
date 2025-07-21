import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID!,
  ClientId: import.meta.env.VITE_CLIENT_ID!,
});

export function signUp(email: string, password: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
    pool.signUp(email, password, attributes, [], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<unknown> {
  const user = new CognitoUser({ Username: email, Pool: pool });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function signIn(email: string, password: string): Promise<string> {
  const user = new CognitoUser({ Username: email, Pool: pool });
  const details = new AuthenticationDetails({
    Username: email,
    Password: password,
  });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => {
        resolve(session.getIdToken().getJwtToken());
      },
      onFailure: (err) => reject(err),
    });
  });
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
      inputVerificationCode: () => resolve(), // Optional, if you want to handle verification code UI
    });
  });
}
