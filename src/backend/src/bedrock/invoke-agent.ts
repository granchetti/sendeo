import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const agent = new BedrockAgentRuntimeClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = event.body ? JSON.parse(event.body) : {};
  const resp = await agent.send(
    new InvokeAgentCommand({
      agentId: process.env.AGENT_ID!,
      agentAliasId: process.env.AGENT_ALIAS_ID!,
      inputText: body.prompt,
    })
  );
  return {
    statusCode: 200,
    body: resp.completion ?? '',
  };
};
