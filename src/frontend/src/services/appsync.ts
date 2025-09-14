import { Amplify } from 'aws-amplify';
import API, { graphqlOperation } from '@aws-amplify/api-graphql';

const awsconfig = {
  aws_project_region: import.meta.env.VITE_APPSYNC_REGION,
  aws_appsync_graphqlEndpoint: import.meta.env.VITE_APPSYNC_URL,
  aws_appsync_region: import.meta.env.VITE_APPSYNC_REGION,
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: import.meta.env.VITE_APPSYNC_API_KEY,
} as any;

Amplify.configure(awsconfig);

export { API, graphqlOperation, awsconfig };
