# SIPPro API Documentation

The SIPPro API is documented using Swagger/OpenAPI.

## Accessing Swagger UI

When running the backend locally, you can access the interactive Swagger documentation at:

**[http://localhost:5062/swagger](http://localhost:5062/swagger)**

## Authentication

All endpoints (except Login/Register) require a JWT Token.

1.  **Login** or **Register** to get an `accessToken`.
2.  Click **Authorize** in Swagger UI.
3.  Enter `Bearer <your_token>`.

## Key Endpoints

### Auth
- `POST /api/Auth/register`: Register a new user.
- `POST /api/Auth/login`: Login and get token.
- `POST /api/Auth/verify/{userId}`: (Admin) Verify a user.
- `GET /api/Auth/me`: Get current user profile.

### Health
- `GET /api/Health`: Check system status.

## Database Schema

See [database_ddl.sql](./database_ddl.sql) for the full database schema.
