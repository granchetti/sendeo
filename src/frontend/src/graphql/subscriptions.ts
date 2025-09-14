export const onRoutesGenerated = /* GraphQL */ `
  subscription OnRoutesGenerated($jobId: ID!) {
    onRoutesGenerated(jobId: $jobId) {
      routeId
      path
      distanceKm
      duration
    }
  }
`;

export const onErrorOccurred = /* GraphQL */ `
  subscription OnErrorOccurred($correlationId: ID!) {
    onErrorOccurred(correlationId: $correlationId) {
      message
      payload
      correlationId
      version
    }
  }
`;
