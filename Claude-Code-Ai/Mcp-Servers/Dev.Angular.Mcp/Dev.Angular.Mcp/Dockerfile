## Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG BUILD_NUMBER=0

COPY Dev.Angular.Mcp ./Dev.Angular.Mcp

RUN dotnet publish Dev.Angular.Mcp/Dev.Angular.Mcp.csproj -c Release -o /out /p:UseAppHost=false \
    /p:InformationalVersion="0.1.0+build.${BUILD_NUMBER}"

## Runtime — Node base with .NET runtime + Angular CLI
FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -o packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends dotnet-runtime-9.0 \
    && npm install -g @angular/cli \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* packages-microsoft-prod.deb

COPY --from=build /out ./
ENV DOTNET_ENVIRONMENT=Production
ENV LOG_VIEWER_PORT=8092
EXPOSE 8092
ENTRYPOINT ["dotnet", "Dev.Angular.Mcp.dll"]
