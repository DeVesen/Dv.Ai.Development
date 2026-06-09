## Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG BUILD_NUMBER=0

COPY Dev.Filesystem.Mcp ./Dev.Filesystem.Mcp

RUN dotnet publish Dev.Filesystem.Mcp/Dev.Filesystem.Mcp.csproj -c Release -o /out /p:UseAppHost=false \
    /p:InformationalVersion="0.1.0+build.${BUILD_NUMBER}"

## Runtime
FROM mcr.microsoft.com/dotnet/runtime:9.0
WORKDIR /app
COPY --from=build /out ./
ENV DOTNET_ENVIRONMENT=Production
ENV PROJECT_ROOT=/project
EXPOSE 8091
ENTRYPOINT ["dotnet", "Dev.Filesystem.Mcp.dll"]
