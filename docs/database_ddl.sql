CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE app_settings (
    key character varying(256) NOT NULL,
    value character varying(2048) NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_app_settings" PRIMARY KEY (key)
);

INSERT INTO app_settings (key, updated_at, value)
VALUES ('app-name', TIMESTAMPTZ '2024-01-01T00:00:00Z', 'SIPPro');

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260210034933_InitialCreate', '8.0.11');

COMMIT;

START TRANSACTION;

CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "Email" character varying(255) NOT NULL,
    "PasswordHash" text NOT NULL,
    "FullName" character varying(100) NOT NULL,
    "NoInduk" character varying(50) NOT NULL,
    "Role" text NOT NULL,
    "IsVerified" boolean NOT NULL,
    "RefreshToken" text,
    "RefreshTokenExpiryTime" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260212024656_CreateUserTable', '8.0.11');

COMMIT;

