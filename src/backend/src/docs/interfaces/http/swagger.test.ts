import { handler } from './swagger';
import { openApiSpec } from '../../openapi';

describe('swagger handler', () => {
  it('returns HTML for /swagger', async () => {
    const res = await handler({
      path: '/swagger',
      httpMethod: 'GET',
      resource: '/swagger',
      requestContext: {} as any,
    } as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('text/html');
    expect(res.body).toContain('SwaggerUIBundle');
  });

  it('returns JSON spec for /swagger.json', async () => {
    const res = await handler({
      path: '/swagger.json',
      httpMethod: 'GET',
      resource: '/swagger.json',
      requestContext: {} as any,
    } as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('application/json');
    expect(res.body).toBe(JSON.stringify(openApiSpec));
  });
});
