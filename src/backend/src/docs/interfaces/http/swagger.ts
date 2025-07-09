// src/routes/interfaces/http/swagger.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { openApiSpec } from "../../openapi";

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
        // construye dinámicamente la URL del JSON
        // si estás en "/prod/swagger" -> specUrl será "/prod/swagger.json"
        const specUrl = window.location.pathname + '.json';
        SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui'
        });
      };
    </script>
  </body>
</html>`;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // usa event.path (la URL real) en lugar de event.resource
  if (event.path.endsWith("/swagger.json")) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(openApiSpec),
    };
  }

  // cualquier otra ruta (incluido "/swagger")
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: html,
  };
};
