# ── Build Stage (Node) ─────────────────────────────────────────────────────────
FROM node:22-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Final Stage ────────────────────────────────────────────────────────────────
# Use .NET SDK image as base so Roslyn/dotnet-script works
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

# Install Node.js 22 into the .NET image
RUN apk add --no-cache nodejs npm git

WORKDIR /app

# Install dotnet-script globally for Roslyn analysis
RUN dotnet tool install -g dotnet-script
ENV PATH="$PATH:/root/.dotnet/tools"

# Warm up dotnet-script NuGet cache (avoids cold-start delay on first review)
COPY roslyn-analyzer/roslyn-analyzer.csx ./roslyn-analyzer/
RUN echo 'public class Dummy {}' > /tmp/warm.cs \
    && dotnet script roslyn-analyzer/roslyn-analyzer.csx -- /tmp/warm.cs > /dev/null 2>&1 || true \
    && rm /tmp/warm.cs

# Install Node production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=node-builder /app/dist ./dist/

# Non-root user
RUN addgroup -S mcpuser && adduser -S mcpuser -G mcpuser -h /home/mcpuser
RUN chown -R mcpuser:mcpuser /app
# dotnet tools need home dir access
RUN cp -r /root/.dotnet /home/mcpuser/.dotnet && chown -R mcpuser:mcpuser /home/mcpuser/.dotnet
USER mcpuser
ENV PATH="$PATH:/home/mcpuser/.dotnet/tools"
ENV HOME=/home/mcpuser

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
