export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Sendeo API",
    version: "1.0.0",
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
    "/routes": {
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
                  distanceKm: { type: "number" },
                  maxDeltaKm: { type: "number" },
                  routesCount: { type: "integer" },
                  jobId: { type: "string" },
                  preference: { type: "string" },
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
    "/routes/{routeId}": {
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
    "/routes/{routeId}/finish": {
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
    "/jobs/{jobId}/routes": {
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
    "/favourites": {
      get: {
        summary: "List favourites",
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Add favourite",
        responses: { "200": { description: "OK" } },
      },
    },
    "/favourites/{routeId}": {
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
    "/profile": {
      get: {
        summary: "Get profile",
        responses: { "200": { description: "OK" } },
      },
      put: {
        summary: "Update profile",
        responses: { "200": { description: "OK" } },
      },
    },
    "/telemetry/started": {
      post: {
        summary: "Start telemetry",
        responses: { "200": { description: "OK" } },
      },
    },
  },
} as const;
