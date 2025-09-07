process.env.APPSYNC_URL = 'https://example.com/graphql';
process.env.APPSYNC_API_KEY = 'test-key';

import { publishFavouriteSaved, publishFavouriteDeleted, publishRoutesGenerated, publishRouteStarted, publishRouteFinished, publishErrorOccurred } from './appsync-client';
import { RouteStatus } from '../domain/value-objects/route-status';
import { Route } from '../domain/entities/route';
import { UUID } from '../../shared/domain/value-objects/uuid';
import { DistanceKm } from '../domain/value-objects/distance';
import { Duration } from '../domain/value-objects/duration';
import { Path } from '../domain/value-objects/path';

describe('appsync-client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue({}) });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('publishFavouriteSaved sends correct payload', async () => {
    await publishFavouriteSaved('user@example.com', 'route-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishFavouriteSaved($email: String!, $routeId: ID!) {\n  publishFavouriteSaved(email: $email, routeId: $routeId)\n}`,
      variables: { email: 'user@example.com', routeId: 'route-1' },
    });
  });

  it('publishFavouriteDeleted sends correct payload', async () => {
    await publishFavouriteDeleted('user@example.com', 'route-1');
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishFavouriteDeleted($email: String!, $routeId: ID!) {\n  publishFavouriteDeleted(email: $email, routeId: $routeId)\n}`,
      variables: { email: 'user@example.com', routeId: 'route-1' },
    });
  });

  it('publishRoutesGenerated sends correct payload', async () => {
    const route = Route.rehydrate({
      routeId: UUID.fromString('11111111-1111-4111-8111-111111111111'),
      distanceKm: new DistanceKm(1),
      duration: new Duration(2),
      path: new Path('encoded'),
      description: 'desc',
      status: RouteStatus.Generated,
    });
    await publishRoutesGenerated('job-1', [route]);
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishRoutesGenerated($jobId: ID!, $routes: [RouteInput]!) {\n  publishRoutesGenerated(jobId: $jobId, routes: $routes)\n}`,
      variables: {
        jobId: 'job-1',
        routes: [
          {
            routeId: route.routeId.Value,
            distanceKm: route.distanceKm?.Value,
            duration: route.duration?.Value,
            path: route.path?.Encoded,
            description: route.description,
          },
        ],
      },
    });
  });

  it('publishRouteStarted sends correct payload', async () => {
    await publishRouteStarted('user@example.com', 'route-1');
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishRouteStarted($email: String!, $routeId: ID!) {\n  publishRouteStarted(email: $email, routeId: $routeId)\n}`,
      variables: { email: 'user@example.com', routeId: 'route-1' },
    });
  });

  it('publishRouteFinished sends correct payload', async () => {
    await publishRouteFinished('user@example.com', 'route-1', 'summary');
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishRouteFinished($email: String!, $routeId: ID!, $summary: String!) {\n  publishRouteFinished(email: $email, routeId: $routeId, summary: $summary)\n}`,
      variables: { email: 'user@example.com', routeId: 'route-1', summary: 'summary' },
    });
  });

  it('publishErrorOccurred sends correct payload', async () => {
    await publishErrorOccurred('boom', { foo: 'bar' });
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      query: `mutation PublishErrorOccurred($message: String!, $payload: AWSJSON) {\n  publishErrorOccurred(message: $message, payload: $payload)\n}`,
      variables: { message: 'boom', payload: { foo: 'bar' } },
    });
  });
});

