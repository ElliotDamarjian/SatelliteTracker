FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY SatelliteTracker.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production

# Render (and most PaaS hosts) inject PORT and expect the app to bind to it;
# ASPNETCORE_URLS needs the port baked in at container start, not build time,
# so this has to happen in the entrypoint rather than a plain ENV line.
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet SatelliteTracker.Api.dll"]
