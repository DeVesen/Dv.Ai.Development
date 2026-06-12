## Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG BUILD_NUMBER=0

COPY Dev.Dotnet.Mcp ./Dev.Dotnet.Mcp

RUN dotnet publish Dev.Dotnet.Mcp/Dev.Dotnet.Mcp.csproj -c Release -o /out /p:UseAppHost=false \
    /p:InformationalVersion="0.1.0+build.${BUILD_NUMBER}"

## .NET 8 runtime — copied from official image so net8.0 test hosts can run alongside SDK 9
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS dotnet8

## Runtime — SDK 9 required for dotnet new / sln add
FROM mcr.microsoft.com/dotnet/sdk:9.0
COPY --from=dotnet8 /usr/share/dotnet/shared/Microsoft.NETCore.App /usr/share/dotnet/shared/Microsoft.NETCore.App
WORKDIR /app
COPY --from=build /out ./
ENV DOTNET_ENVIRONMENT=Production
ENV LOG_VIEWER_PORT=8093
EXPOSE 8093
ENTRYPOINT ["dotnet", "Dev.Dotnet.Mcp.dll"]
