# SIPPro Architecture

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | Next.js 14+, TypeScript, pnpm       |
| Backend    | .NET 8, ASP.NET Core Web API        |
| Database   | PostgreSQL 16                        |
| ORM        | Entity Framework Core (Npgsql)       |
| API Docs   | Swagger / OpenAPI (Swashbuckle)      |
| Dev Env    | Docker Compose (PostgreSQL, pgAdmin) |

## Backend Layers

```
┌─────────────────────────────┐
│   SIPPro.Api (Controllers)  │  ← HTTP endpoints, DI, middleware
├─────────────────────────────┤
│  SIPPro.Application         │  ← Services, DTOs, use cases
├─────────────────────────────┤
│  SIPPro.Domain              │  ← Entities, interfaces (no deps)
├─────────────────────────────┤
│  SIPPro.Persistence         │  ← EF Core DbContext, repos
├─────────────────────────────┤
│  SIPPro.Infrastructure      │  ← External integrations
└─────────────────────────────┘
```

## Project References

- **Api** → Application, Infrastructure, Persistence
- **Application** → Domain
- **Persistence** → Domain
- **Infrastructure** → Application

## Data Flow

```
Client → Controller → Service → Repository → DbContext → PostgreSQL
```

## Endpoints

| Method | Path                  | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | /api/health           | Health check               |
| GET    | /api/version          | API version info           |
| GET    | /api/settings/{key}   | Read setting from database |
