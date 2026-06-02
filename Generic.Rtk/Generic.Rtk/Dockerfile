## Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG BUILD_NUMBER=0

COPY Generic.Rtk ./Generic.Rtk

RUN dotnet publish Generic.Rtk/Generic.Rtk.csproj -c Release -o /out /p:UseAppHost=false \
    /p:InformationalVersion="0.2.0+build.${BUILD_NUMBER}"

## Runtime
FROM mcr.microsoft.com/dotnet/runtime:9.0
WORKDIR /app
COPY --from=build /out ./
ENV DOTNET_ENVIRONMENT=Production
EXPOSE 8089
ENTRYPOINT ["dotnet", "Generic.Rtk.dll"]
