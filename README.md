# Sendeo

## Frontend Setup

The frontend lives under `src/frontend` and uses Vite. Before running the development server you must provide the AWS Cognito configuration and API URL via a `.env` file.

Create `src/frontend/.env` (or copy from `.env.example`) with the following variables:

```
VITE_USER_POOL_ID=your-user-pool
VITE_CLIENT_ID=your-client-id
VITE_REGION=aws-region
VITE_API_URL=https://api.example.com/prod
```

Install dependencies and start the dev server:

```bash
cd src/frontend
npm install
npm run dev
```

After logging in you can test the authentication by calling the protected `GET /profile` endpoint.
