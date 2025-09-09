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
