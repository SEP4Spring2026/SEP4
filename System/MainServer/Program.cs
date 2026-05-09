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

var mlUrl = Environment.GetEnvironmentVariable("ML_SERVER_URL") ?? "http://ml-server:8000";

var connectionString =
    $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};";

var parsedDbHost = System.Text.RegularExpressions.Regex.Match(connectionString ?? "", @"Server=([^;]+)").Groups[1].Value;
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
        // Backward-compatible fallback for databases originally initialized via EnsureCreated.
        Console.WriteLine($"[startup] migrate failed, falling back to EnsureCreated: {ex.Message}");
        db.Database.EnsureCreated();
    }
}

app.UseCors("AllowFrontend");

app.MapControllers();
app.Run();
