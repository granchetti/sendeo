# Sendeo

## Authentication

The frontend stores the Cognito ID and refresh tokens in `localStorage` and in
the React context. API requests automatically refresh the ID token if it has
expired using the stored refresh token. This allows users to stay logged in
without re‑entering credentials until the refresh token itself expires.
