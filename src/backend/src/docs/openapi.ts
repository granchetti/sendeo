export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Sendeo API",
    version: "1.0.0",
    description:
      "All queue and AppSync payloads include a `version` field (currently 1).",
  },
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

  security: [{ cognitoAuth: [] }],
  paths: {
    "/v1/routes": {
      get: {
        summary: "List routes",
        responses: {
          "200": { description: "OK" },
        },
      },
      post: {
        summary: "Request routes",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  origin: { type: "string" },
                  destination: { type: "string" },
                  distanceKm: { type: "number", minimum: 1, maximum: 100 },
                  routesCount: { type: "integer" },
                  jobId: { type: "string" },
                  correlationId: { type: "string" },
                },
                required: ["origin"],
              },
            },
          },
        },
        responses: {
          "202": { description: "Accepted" },
          "400": { description: "Bad Request" },
        },
      },
    },
    "/v1/routes/{routeId}": {
      get: {
        summary: "Get route details",
        parameters: [
          {
            name: "routeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not Found" },
        },
      },
    },
    "/v1/routes/{routeId}/finish": {
      post: {
        summary: "Finish route",
        parameters: [
          {
            name: "routeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/v1/jobs/{jobId}/routes": {
      get: {
        summary: "List routes for job",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "OK" },
          "400": { description: "Bad Request" },
        },
      },
    },
    "/v1/favourites": {
      get: {
        summary: "List favourites",
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Add favourite",
        responses: { "200": { description: "OK" } },
      },
    },
    "/v1/favourites/{routeId}": {
      delete: {
        summary: "Remove favourite",
        parameters: [
          {
            name: "routeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/v1/profile": {
      get: {
        summary: "Get profile",
        responses: { "200": { description: "OK" } },
      },
      put: {
        summary: "Update profile",
        responses: { "200": { description: "OK" } },
      },
    },
    "/v1/telemetry/started": {
      post: {
        summary: "Start telemetry",
        responses: { "200": { description: "OK" } },
      },
    },
  },
} as const;
