# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first (layer caching)
COPY *.sln ./
COPY src/*/*.csproj ./
RUN for file in *.csproj; do \
      dir=$(basename "$file" .csproj); \
      mkdir -p "src/$dir" && mv "$file" "src/$dir/"; \
    done

# Restore dependencies
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish src/*.Api/*.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    -r linux-arm64 \
    --self-contained false

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled-arm64v8 AS runtime
WORKDIR /app

# Non-root user (chiseled images run as non-root by default)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["dotnet", "/app/*.Api.dll", "--urls", "http://localhost:8080/health/live"] || exit 1

ENTRYPOINT ["dotnet"]
CMD ["*.Api.dll"]
# NOTE: Replace *.Api.dll with your actual assembly name, e.g. InvoiceService.Api.dll
