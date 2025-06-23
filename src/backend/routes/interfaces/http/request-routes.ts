import { RequestRoutesUseCase } from '../../application/use-cases/request-routes';
import { InMemoryRouteRepository } from '../../infrastructure/in-memory/route-repository';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const repository = new InMemoryRouteRepository();
const useCase = new RequestRoutesUseCase(repository);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const data = event.body ? JSON.parse(event.body) : {};
  const route = await useCase.execute(data);

  return {
    statusCode: 200,
    body: JSON.stringify(route),
  };
};