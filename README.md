# SIPPro

Full-stack web application with **.NET 8** backend and **Next.js** frontend.

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | Next.js 16, TypeScript (strict), pnpm |
| Backend  | .NET 8, ASP.NET Core Web API         |
| Database | PostgreSQL 16                         |
| ORM      | Entity Framework Core 8 (Npgsql)      |
| API Docs | Swagger / OpenAPI                     |
| Dev Env  | Docker Compose                        |

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) with [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [EF Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet) (`dotnet tool install --global dotnet-ef`)

## Quick Start

### 1. Start PostgreSQL

```bash
# From repository root
docker compose up -d
```

Verify it's running:
```bash
docker compose ps
```

You should see `sippro-postgres` (port 5432) and `sippro-pgadmin` (port 5050) both running.

**pgAdmin** (optional): Open http://localhost:5050
- Email: `admin@sippro.local`
- Password: `[YOUR_ADMIN_PASSWORD]`
- Add server: Host=`postgres`, Port=`5432`, User=`sippro`, Password=`[YOUR_DB_PASSWORD]`

### 2. Run Database Migrations

```bash
cd backend
dotnet ef database update --project src/SIPPro.Persistence --startup-project src/SIPPro.Api
```

This creates the `app_settings` table and seeds the `app-name` record.

### 3. Start Backend

```bash
cd backend
dotnet run --project src/SIPPro.Api
```

Backend runs at: http://localhost:5062
Swagger UI: http://localhost:5062/swagger

### 4. Start Frontend

```bash
cd frontend
pnpm install   # first time only
pnpm dev
```

Frontend runs at: http://localhost:3000
Health page: http://localhost:3000/health

## API Endpoints

| Method | Path                 | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/api/health`        | Health check          |
| GET    | `/api/version`       | API version info      |
| GET    | `/api/settings/{key}`| Read setting from DB  |

### Test with curl

```bash
# Health check
curl http://localhost:5062/api/health
# → {"status":"ok","service":"sippro-api","timestamp":"2024-01-01T00:00:00.0000000Z"}

# Version
curl http://localhost:5062/api/version
# → {"name":"SIPPro","apiVersion":"v1"}

# Setting from database
curl http://localhost:5062/api/settings/app-name
# → {"key":"app-name","value":"SIPPro"}
```

## Project Structure

```
SIPP/
├── docker-compose.yml          # PostgreSQL + pgAdmin
├── docs/
│   └── architecture.md         # Architecture overview
├── backend/
│   ├── SIPPro.sln
│   └── src/
│       ├── SIPPro.Api/          # Controllers, Swagger, DI, config
│       ├── SIPPro.Application/  # Services, DTOs, interfaces
│       ├── SIPPro.Domain/       # Entities, repository interfaces
│       ├── SIPPro.Infrastructure/ # External integrations (placeholder)
│       └── SIPPro.Persistence/  # EF Core DbContext, repos, migrations
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── health/page.tsx  # Health check page
    │   └── types/api.ts         # Typed API interfaces
    ├── .env.example
    ├── .prettierrc
    └── eslint.config.mjs
```

## Environment Variables

### Backend (`backend/.env.example`)

| Variable               | Default                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`         | `Host=localhost;Port=5432;Database=sippro_db;Username=sippro;Password=[YOUR_DB_PASSWORD]` |
| `ASPNETCORE_ENVIRONMENT` | `Development`                                                           |

### Frontend (`frontend/.env.example`)

| Variable              | Default                  |
| --------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:5062`  |

## Useful Commands

```bash
# Backend
dotnet build                        # Build all projects
dotnet run --project src/SIPPro.Api # Run API server

# Migrations
dotnet ef migrations add <Name> --project src/SIPPro.Persistence --startup-project src/SIPPro.Api
dotnet ef database update --project src/SIPPro.Persistence --startup-project src/SIPPro.Api

# Frontend
pnpm dev              # Dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting

# Docker
docker compose up -d   # Start services
docker compose down    # Stop services
docker compose ps      # Check status
docker compose logs    # View logs
```

## Troubleshooting

### Port 5432 already in use
Another PostgreSQL instance is running. Either stop it or change the port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use 5433 instead
```
Then update the connection string in `appsettings.json` to use `Port=5433`.

### Port 5062 already in use
Change the port in `backend/src/SIPPro.Api/Properties/launchSettings.json`:
```json
"applicationUrl": "http://localhost:5063"
```
Then update `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

### Database migration fails
1. Ensure Docker is running: `docker compose ps`
2. Ensure PostgreSQL is healthy: `docker compose logs postgres`
3. Check connection string matches what's in `docker-compose.yml`

### Frontend can't reach backend (CORS error)
Ensure the backend is running and CORS origins include `http://localhost:3000` (already configured in `appsettings.json`).

### Docker Desktop not starting
- Windows: Enable WSL 2 and Hyper-V in Windows Features
- Restart Docker Desktop after enabling features
- Run `docker --version` to verify installation

### EF Core tools not found
```bash
dotnet tool install --global dotnet-ef --version 8.0.11
```
