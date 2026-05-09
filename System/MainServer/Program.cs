using MainServer.Data;
using MainServer.Logging;
using MainServer.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

DotNetEnv.Env.Load();

var liveLogBuffer = new InMemoryLogBuffer(maxLines: 800);
builder.Services.AddSingleton(liveLogBuffer);
builder.Logging.AddProvider(new InMemoryLoggerProvider(liveLogBuffer));

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


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
);

builder.Services.AddHttpClient<MlClient>(client =>
{
    client.BaseAddress = new Uri(mlUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddSingleton<ReadingsStreamHub>();
builder.Services.AddSingleton<AlarmMqttPublisher>();
builder.Services.AddHostedService<AlarmMqttShutdownHostedService>();

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
            policy.SetIsOriginAllowed(_ => true);
            return;
        }

        policy.AllowAnyOrigin();
    });
});

var app = builder.Build();

var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
startupLogger.LogInformation("DB host: {DbHost}; ML URL: {MlUrl}", dbHost ?? "(null)", mlUrl);
var alarmMqtt = Environment.GetEnvironmentVariable("ALARM_MQTT_HOST")?.Trim();
if (!string.IsNullOrEmpty(alarmMqtt))
{
    startupLogger.LogInformation(
        "Alarm MQTT: {Host} (ML risk High→CRITICAL, Low→OFF; Medium→WARN only if ALARM_PUBLISH_MEDIUM=true)",
        alarmMqtt);
}

if (string.Equals(Environment.GetEnvironmentVariable("ALLOW_ALARM_TEST"), "true", StringComparison.OrdinalIgnoreCase))
{
    startupLogger.LogInformation("POST /api/readings/alarm-test is enabled for buzzer tests.");
}

await ApplyMigrationsWithRepairAsync(app, startupLogger);

app.UseCors("AllowFrontend");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/logs", (InMemoryLogBuffer logs) =>
    Results.Text(string.Join(Environment.NewLine, logs.Snapshot()), "text/plain; charset=utf-8"));

app.MapControllers();

startupLogger.LogInformation("MainServer ready; buffered diagnostics at GET /api/logs.");

app.Run();

static async Task ApplyMigrationsWithRepairAsync(WebApplication application, ILogger startupLog)
{
    await using var scope = application.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync().ConfigureAwait(false);
    }
    catch (Exception ex)
    {
        startupLog.LogWarning(ex, "Database.MigrateAsync failed; attempting legacy schema repair");
        await DbSchemaRepair.RepairAfterMigrateFailureAsync(db, startupLog).ConfigureAwait(false);
        await db.Database.MigrateAsync().ConfigureAwait(false);
    }
}
