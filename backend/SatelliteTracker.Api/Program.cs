using SatelliteTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton(_ =>
{
    var client = new HttpClient();
    // CelesTrak's usage policy asks clients to identify themselves; requests with no
    // User-Agent (the .NET HttpClient default) get 403'd on their larger data groups.
    client.DefaultRequestHeaders.UserAgent.ParseAdd("SatelliteTracker/1.0 (personal hobby project)");
    return client;
});
builder.Services.AddSingleton<TleCacheService>();
builder.Services.AddSingleton<PropagationService>();

// Comma-separated list, e.g. "https://my-app.vercel.app,https://my-app-preview.vercel.app".
// Falls back to the local dev frontend port. Override via the FrontendOrigins
// config key (an environment variable of the same name works out of the box —
// ASP.NET Core maps env vars onto configuration keys automatically) once deployed.
var frontendOrigins = (builder.Configuration["FrontendOrigins"] ?? "http://localhost:3100")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
