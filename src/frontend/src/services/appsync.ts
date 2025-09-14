import { Amplify, type ResourcesConfig } from 'aws-amplify';
import API, { graphqlOperation } from '@aws-amplify/api-graphql';

const awsconfig: ResourcesConfig = {
  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_APPSYNC_URL,
      region: import.meta.env.VITE_APPSYNC_REGION,
      defaultAuthMode: 'apiKey',
      apiKey: import.meta.env.VITE_APPSYNC_API_KEY,
    },
  },
};

Amplify.configure(awsconfig);

export { API, graphqlOperation, awsconfig };
