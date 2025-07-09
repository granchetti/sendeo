import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { openApiSpec } from "../../openapi";

const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Sendeo API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: '/swagger.json',
          dom_id: '#swagger-ui'
        });
      };
    </script>
  </body>
</html>`;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.resource === "/swagger.json") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(openApiSpec),
    };
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: html,
  };
};
