FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
# A single publish (implicit restore) rather than a separate restore layer +
# --no-restore publish — the split version failed here with a NuGet fallback
# folder path baked into the cached restore pointing at a Windows-only path
# that doesn't exist in the Linux build container. Costs a bit of layer-cache
# efficiency on rebuilds; not worth the fragility for a small single-project app.
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production

# Render (and most PaaS hosts) inject PORT and expect the app to bind to it;
# ASPNETCORE_URLS needs the port baked in at container start, not build time,
# so this has to happen in the entrypoint rather than a plain ENV line.
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet SatelliteTracker.Api.dll"]
