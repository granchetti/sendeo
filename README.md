# Sendeo

Sendeo is a full‑stack, serverless application to plan and explore routes. It provides a React frontend and an AWS‑backed backend (API Gateway + Lambda + DynamoDB + SQS + AppSync + Cognito), all provisioned with AWS CDK. The system supports generating routes, viewing details, saving favourites, tracking telemetry, and managing user profiles. API documentation is published via Swagger.

This README covers the architecture, required tooling, environment, and the most important commands to develop, test, and deploy each part of the project.

**At a Glance**
- Frontend: React + Vite + Chakra UI, Cognito auth, Playwright E2E.
- Backend: TypeScript Lambdas behind API Gateway, DynamoDB, SQS, Bedrock.
- Infrastructure: AWS CDK stacks for compute, storage, auth, queues, AppSync, Amplify.
- CI/CD: GitHub Actions for linting, tests, and CDK deploy to dev/prod.

**Project Structure**
- `src/frontend`: React app (Vite), Playwright E2E tests.
- `src/backend`: Lambda handlers, domain logic, Jest unit/integration tests.
- `infrastructure`: AWS CDK app and stacks (TS), Jest unit tests.
- `amplify.yml`: Amplify build spec for the frontend.
- `.github/workflows`: CI/CD pipelines for tests and deployments.

## Prerequisites
- Node.js `20` (see `src/frontend/.nvmrc`).
- npm `>=10`.
- AWS account and credentials configured (`aws configure`), with permissions for CDK deploys.
- For deployment:
  - An AWS Secrets Manager secret named `google-api-key` containing the Google Maps API key.
  - An AWS Secrets Manager secret named `my-github-token` with a JSON field `GITHUB_TOKEN` for Amplify to read.

## Environment
- Frontend `.env` (example in `src/frontend/.env`):
  - `VITE_USER_POOL_ID`: Cognito User Pool ID.
  - `VITE_CLIENT_ID`: Cognito App Client ID.
  - `VITE_REGION`: AWS region (e.g., `eu-west-1`).
  - `VITE_API_URL`: API Gateway base URL (e.g., `https://.../prod`).
  - `VITE_GOOGLE_MAPS_API_KEY`: Google Maps JS API key (for map rendering).
- Optional E2E runtime variable:
  - `E2E_BASE_URL`: Overrides Playwright’s baseURL to test an already running frontend.

## Install
- Frontend: `cd src/frontend && npm ci`
- Backend: `cd src/backend && npm ci`
- Infrastructure: `cd infrastructure && npm ci`

## Frontend
- Dev server: `cd src/frontend && npm run dev`
- Build: `cd src/frontend && npm run build`
- Preview build: `cd src/frontend && npm run preview`
- Lint: `cd src/frontend && npm run lint`
- Test: `cd src/frontend && npm test`
- E2E tests:
  - Install browsers: `cd src/frontend && npm run pretest:e2e`
  - Run tests: `cd src/frontend && npm run test:e2e`

Notes
- The dev server uses the values in `src/frontend/.env` (or your shell env) to authenticate against Cognito and call the API.
- To run E2E against a deployed site, set `E2E_BASE_URL` and the required `VITE_*` variables in the environment.

## Backend
- Unit tests: `cd src/backend && npm run test:unit`
- E2E tests: `cd src/backend && npm run test:e2e`
- Build: `cd src/backend && npm run build`

Key endpoints (Cognito JWT required)
- `GET /v1/routes`: List routes (pagination via `cursor`, `limit`).
- `POST /v1/routes`: Request route generation; enqueues job to SQS. Body: `origin` and either `destination` or `distanceKm`.
- `GET /v1/routes/{routeId}`: Route details (autodescribes via Google Maps + Bedrock if missing).
- `GET /v1/jobs/{jobId}/routes`: List generated routes for a job.
- `POST /v1/telemetry/started`: Start telemetry for a route (`{ routeId }`).
- `POST /v1/routes/{routeId}/finish`: Finish route and return final details.
- `GET /v1/favourites`: List favourite routes.
- `POST /v1/favourites`: Save favourite (`{ routeId }`).
- `DELETE /v1/favourites/{routeId}`: Remove favourite.
- `GET /v1/profile`: Get user profile.
- `PUT /v1/profile`: Update user profile.
- Swagger UI: `GET /swagger` and `GET /swagger.json` (base path `/prod`).

## Infrastructure (AWS CDK)
- Build: `cd infrastructure && npm run build`
- Synthesize (dev): `cd infrastructure && npx cdk synth -c env=dev`
- Deploy all (dev): `cd infrastructure && npx cdk deploy --all -c env=dev --require-approval=never`
- Synthesize (prod): `cd infrastructure && npx cdk synth -c env=prod`
- Deploy all (prod): `cd infrastructure && npx cdk deploy --all -c env=prod --require-approval=never`

Stacks
- Storage: DynamoDB tables for routes and user state (`Routes-<stage>`, `UserState-<stage>`).
- Queues: SQS (`RouteJobsQueue-<stage>`, `RouteJobsDLQ-<stage>`, `MetricsQueue-<stage>`, `MetricsDLQ-<stage>`) with CloudWatch alarms when messages appear in the DLQs.
- Auth: Cognito User Pool and App Client (pre‑signup trigger in non‑prod).
- AppSync: GraphQL API for real‑time events and mutations.
- Compute: REST API (API Gateway + Lambda handlers), SQS consumers, metrics processor, and Swagger.
- Frontend: Amplify app connected to this GitHub repo (`amplify.yml`).

Useful CDK context and outputs
- Context `-c env=<dev|prod>` or env var `DEPLOY_ENV` controls stage.
- Outputs include API URL, AppSync URL and API key, and User Pool Client ID.

## CI/CD
- Tests: `.github/workflows/tests.yml` runs frontend lint, backend unit tests, and infra unit tests on PRs to `main`.
- Dev deploy: `.github/workflows/deploy-dev.yml` lints/tests, then deploys CDK stacks to `dev` (manual or hourly schedule). 
- Prod deploy: `.github/workflows/deploy-prod.yml` runs E2E with Playwright against `dev`. If green, deploys to `prod`.

## Common Tasks and Commands
- Install all deps:
  - Frontend: `cd src/frontend && npm ci`
  - Backend: `cd src/backend && npm ci`
  - Infrastructure: `cd infrastructure && npm ci`
- Run frontend locally: `cd src/frontend && npm run dev`
- Run frontend tests: `cd src/frontend && npm test`
- Run backend tests: `cd src/backend && npm run test:unit`
- Run infrastructure tests: `cd infrastructure && npm run test:unit`
- Deploy dev (all stacks): `cd infrastructure && npx cdk deploy --all -c env=dev --require-approval=never`
- Open API docs: `<API_GATEWAY_URL>/prod/swagger`

## Troubleshooting
- 401/Unauthorized from API: confirm `idToken` is present and valid in local storage; ensure `VITE_USER_POOL_ID` and `VITE_CLIENT_ID` match your deployed Cognito.
- 400 on `POST /v1/routes`: body must include `origin` and one of `destination` or `distanceKm` (1–100).
- Missing route descriptions: ensure the Google Maps key is set in Secrets Manager (`google-api-key`) and `VITE_GOOGLE_MAPS_API_KEY` for the frontend map.
- CDK deployment errors: verify AWS credentials, region, and required secrets (`google-api-key`, `my-github-token`).
