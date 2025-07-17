export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Sendeo API",
    version: "1.0.0",
  },
  // API Gateway uses the default "prod" stage when no stage name is provided.
  // Specify it here so Swagger UI generates the correct base URLs.
  servers: [{ url: "/prod" }],
  components: {
    securitySchemes: {
      cognitoAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  // Require the Cognito bearer token for all operations except Swagger itself.
  security: [{ cognitoAuth: [] }],
  paths: {
    "/routes": {
      get: {
        summary: "List routes",
        responses: {
          "200": { description: "OK" },
        },
      },
      post: {
        summary: "Request routes",
        responses: {
          "202": { description: "Accepted" },
        },
      },
    },
    "/routes/{routeId}": {
      get: {
        summary: "Get route details",
        parameters: [
          { name: "routeId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not Found" } },
      },
      post: {
        summary: "Finish route",
        parameters: [
          { name: "routeId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/favourites": {
      get: { summary: "List favourites", responses: { "200": { description: "OK" } } },
      post: { summary: "Add favourite", responses: { "200": { description: "OK" } } },
    },
    "/favourites/{routeId}": {
      delete: {
        summary: "Remove favourite",
        parameters: [
          { name: "routeId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/profile": {
      get: { summary: "Get profile", responses: { "200": { description: "OK" } } },
      put: { summary: "Update profile", responses: { "200": { description: "OK" } } },
    },
    "/telemetry/started": {
      post: { summary: "Start telemetry", responses: { "200": { description: "OK" } } },
    },
  },
} as const;
