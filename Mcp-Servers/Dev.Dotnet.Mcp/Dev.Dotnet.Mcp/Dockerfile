## Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG BUILD_NUMBER=0

COPY Dev.Dotnet.Mcp ./Dev.Dotnet.Mcp

RUN dotnet publish Dev.Dotnet.Mcp/Dev.Dotnet.Mcp.csproj -c Release -o /out /p:UseAppHost=false \
    /p:InformationalVersion="0.1.0+build.${BUILD_NUMBER}"

## Runtime — SDK required for dotnet new / sln add; .NET 8 runtime added for net8.0 test hosts
FROM mcr.microsoft.com/dotnet/sdk:9.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends dotnet-runtime-8.0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out ./
ENV DOTNET_ENVIRONMENT=Production
ENV LOG_VIEWER_PORT=8093
EXPOSE 8093
ENTRYPOINT ["dotnet", "Dev.Dotnet.Mcp.dll"]
