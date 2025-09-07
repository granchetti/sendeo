import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { openApiSpec } from "../../openapi";
import { corsHeaders, jsonHeaders } from "../../../http/cors";
import { base } from "../../../http/base";

const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Sendeo API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
    <!-- evita que intente cargar /favicon.ico -->
    <link rel="icon" href="data:,">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        const specUrl = window.location.pathname + '.json';
        SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui',
          persistAuthorization: true
        });
      };
    </script>
  </body>
</html>`;

export const handler = base(async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.path.endsWith("/swagger.json")) {
    const accept = event.headers?.Accept || event.headers?.accept;
    if (accept !== "application/json") {
      return {
        statusCode: 415,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Unsupported Media Type" }),
      };
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(openApiSpec),
    };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
});
