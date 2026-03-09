# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER app
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/SIPPro.Api/SIPPro.Api.csproj", "src/SIPPro.Api/"]
COPY ["src/SIPPro.Application/SIPPro.Application.csproj", "src/SIPPro.Application/"]
COPY ["src/SIPPro.Domain/SIPPro.Domain.csproj", "src/SIPPro.Domain/"]
COPY ["src/SIPPro.Infrastructure/SIPPro.Infrastructure.csproj", "src/SIPPro.Infrastructure/"]
COPY ["src/SIPPro.Persistence/SIPPro.Persistence.csproj", "src/SIPPro.Persistence/"]
RUN dotnet restore "./src/SIPPro.Api/SIPPro.Api.csproj"
COPY . .
WORKDIR "/src/src/SIPPro.Api"
RUN dotnet build "./SIPPro.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./SIPPro.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SIPPro.Api.dll"]
