# ── Build Stage (Node) ─────────────────────────────────────────────────────────
FROM node:22-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Final Stage ────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

RUN apk add --no-cache nodejs npm git

WORKDIR /app

# Install dotnet-script globally
RUN dotnet tool install -g dotnet-script
ENV PATH="$PATH:/root/.dotnet/tools"

# NuGet packages at a fixed world-readable path — same for root AND mcpuser
ENV NUGET_PACKAGES=/app/nuget-cache

# Copy roslyn scripts
COPY roslyn-analyzer/ ./roslyn-analyzer/

# Warm up ALL scripts as root — packages land in /app/nuget-cache
RUN echo 'public class Dummy {}' > /tmp/warm.cs && mkdir -p /tmp/warmdir \
    && dotnet script roslyn-analyzer/roslyn-analyzer.csx -- /tmp/warm.cs > /dev/null \
    && dotnet script roslyn-analyzer/dotnet-indexer.csx -- /tmp/warmdir > /dev/null 2>&1 || true \
    && echo 'Microsoft Visual Studio Solution File, Format Version 12.00\nProject("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Warm", "Warm.csproj", "{GUID}"\nEndProject' > /tmp/warm.sln \
    && echo '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>' > /tmp/Warm.csproj \
    && dotnet script roslyn-analyzer/dotnet-indexer.csx -- /tmp/warm.sln > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-references.csx -- /tmp/warmdir Dummy > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-hierarchy.csx -- /tmp/warmdir Dummy "" both > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-advanced.csx -- /tmp/warmdir all > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-split.csx -- /tmp/warmdir > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-intelligence.csx -- /tmp/warmdir maintainability > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-test-quality.csx -- /tmp/warmdir > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-test-coverage-static.csx -- /tmp/warmdir project > /dev/null 2>&1 || true \
    && dotnet script roslyn-analyzer/roslyn-extraction.csx -- /tmp/warm.cs 20 8 > /dev/null 2>&1 || true \
    && echo '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>' > /tmp/warm.csproj \
    && dotnet script roslyn-analyzer/roslyn-diagnostics.csx -- /tmp/warm.csproj error > /dev/null 2>&1 || true \
    && rm -rf /tmp/warm.cs /tmp/warmdir /tmp/warm.csproj

# Verify critical packages are cached
RUN ls /app/nuget-cache/microsoft.codeanalysis.csharp/5.0.0-2.final > /dev/null \
    && ls /app/nuget-cache/microsoft.codeanalysis.common/5.0.0-2.final > /dev/null

# Make cache readable by all users
RUN chmod -R 755 /app/nuget-cache

# Copy dotnet-script tools to shared location accessible by mcpuser
RUN cp -r /root/.dotnet/tools /app/dotnet-tools

# Install Node production deps and compiled JS
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=node-builder /app/dist ./dist/

# Non-root user
RUN addgroup -S mcpuser && adduser -S mcpuser -G mcpuser -h /home/mcpuser \
    && chown -R mcpuser:mcpuser /app/dist /app/node_modules /app/package.json

USER mcpuser
ENV HOME=/home/mcpuser
ENV NUGET_PACKAGES=/app/nuget-cache
ENV PATH="$PATH:/app/dotnet-tools"
ENV NODE_ENV=production
EXPOSE 8090

CMD ["node", "dist/index.js"]
