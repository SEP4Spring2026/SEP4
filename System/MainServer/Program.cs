using MainServer.Data;
using MainServer.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

DotNetEnv.Env.Load();

builder.Services.AddControllers();

var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbPort = Environment.GetEnvironmentVariable("DB_PORT");
var dbName = Environment.GetEnvironmentVariable("DB_NAME");
var dbUser = Environment.GetEnvironmentVariable("DB_USER");
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");

var mlUrlRaw = Environment.GetEnvironmentVariable("ML_SERVER_URL");
var mlUrl = string.IsNullOrWhiteSpace(mlUrlRaw) ? "http://ml-server:8000" : mlUrlRaw.Trim();
if (!Uri.TryCreate(mlUrl, UriKind.Absolute, out var mlUri)
    || (mlUri.Scheme != Uri.UriSchemeHttp && mlUri.Scheme != Uri.UriSchemeHttps))
{
    Console.WriteLine($"[startup] Invalid ML_SERVER_URL '{mlUrl}', using http://ml-server:8000");
    mlUrl = "http://ml-server:8000";
}

var connectionString =
    $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};";

if (string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(dbHost)
        || string.IsNullOrWhiteSpace(dbPort)
        || string.IsNullOrWhiteSpace(dbName)
        || string.IsNullOrWhiteSpace(dbUser)
        || string.IsNullOrWhiteSpace(dbPassword))
    {
        Console.WriteLine("[startup] Missing DB_HOST, DB_PORT, DB_NAME, DB_USER, or DB_PASSWORD.");
        Environment.Exit(1);
    }

    connectionString += ";SslMode=None;AllowPublicKeyRetrieval=true";
}


Console.WriteLine($"[startup] DB host: {dbHost}");
Console.WriteLine($"[startup] ML URL : {mlUrl}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
);

builder.Services.AddHttpClient<MlClient>(client =>
{
    client.BaseAddress = new Uri(mlUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddSingleton<ReadingsStreamHub>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = (Environment.GetEnvironmentVariable("FRONTEND_ALLOWED_ORIGINS") ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        policy.AllowAnyHeader().AllowAnyMethod();

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins);
            return;
        }

        if (builder.Environment.IsDevelopment())
        {
<<<<<<< HEAD
            // Local development fallback when explicit origins are not configured.
            policy.SetIsOriginAllowed(_ => true);
        }
=======
            policy.SetIsOriginAllowed(_ => true);
            return;
        }

        policy.AllowAnyOrigin();
>>>>>>> 4320dbf64c21bd6757efc9964d4e2b3b4f09a00f
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[startup] migrate failed, falling back to EnsureCreated: {ex}");
        try
        {
            db.Database.EnsureCreated();
        }
        catch (Exception ex2)
        {
            Console.WriteLine($"[startup] EnsureCreated failed (continuing anyway): {ex2}");
        }
    }
}

app.UseCors("AllowFrontend");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();
app.Run();
