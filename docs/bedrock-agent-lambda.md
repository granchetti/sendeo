# Bedrock Agent Lambda

This Lambda invokes an Amazon Bedrock agent. The handler expects the following environment variables:

- `AGENT_ID` – ID of the Bedrock agent
- `AGENT_ALIAS_ID` – alias ID for the agent

Deploy the compiled function using your preferred method (e.g. AWS CDK). When triggered through API Gateway, send a JSON payload with a `prompt` field.
