using MainServer.Data;
using MainServer.Logging;
using MainServer.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

DotNetEnv.Env.Load();

// -------------------- LOGGING --------------------
var liveLogBuffer = new InMemoryLogBuffer(maxLines: 800);
builder.Services.AddSingleton(liveLogBuffer);
builder.Logging.AddProvider(new InMemoryLoggerProvider(liveLogBuffer));

// -------------------- CONTROLLERS --------------------
builder.Services.AddControllers();

// -------------------- DB --------------------
var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbPort = Environment.GetEnvironmentVariable("DB_PORT");
var dbName = Environment.GetEnvironmentVariable("DB_NAME");
var dbUser = Environment.GetEnvironmentVariable("DB_USER");
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");

var connectionString =
    $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};";

if (string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
{
    connectionString += ";SslMode=None;AllowPublicKeyRetrieval=true";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
);

// -------------------- JWT CONFIG --------------------
var jwtKey = builder.Configuration["Jwt:Key"]
             ?? Environment.GetEnvironmentVariable("JWT_KEY");

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MainServer";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MainClient";

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new Exception("JWT key is missing. Set Jwt:Key or JWT_KEY.");
}

var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
var signingKey = new SymmetricSecurityKey(keyBytes);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = signingKey,

            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// -------------------- SERVICES --------------------
builder.Services.AddScoped<JwtService>();

builder.Services.AddHttpClient<MlClient>(client =>
{
    var mlUrlRaw = Environment.GetEnvironmentVariable("ML_SERVER_URL");
    var mlUrl = string.IsNullOrWhiteSpace(mlUrlRaw) ? "http://ml-server:8000" : mlUrlRaw.Trim();
    client.BaseAddress = new Uri(mlUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});

builder.Services.AddSingleton<ReadingsStreamHub>();
builder.Services.AddSingleton<AlarmMqttPublisher>();
builder.Services.AddHostedService<AlarmMqttShutdownHostedService>();

// -------------------- CORS --------------------
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
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(_ => true);
        }
        else
        {
            policy.AllowAnyOrigin();
        }
    });
});

var app = builder.Build();

// -------------------- MIDDLEWARE ORDER (IMPORTANT) --------------------
app.UseCors("AllowFrontend");

app.UseAuthentication();   // MUST be before authorization
app.UseAuthorization();

// -------------------- ROUTES --------------------
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/logs", (InMemoryLogBuffer logs) =>
    Results.Text(string.Join(Environment.NewLine, logs.Snapshot()), "text/plain; charset=utf-8"));

app.MapControllers();

// -------------------- STARTUP --------------------
var startupLogger = app.Services.GetRequiredService<ILoggerFactory>()
    .CreateLogger("Startup");

startupLogger.LogInformation("MainServer starting...");

await ApplyMigrationsWithRepairAsync(app, startupLogger);

startupLogger.LogInformation("MainServer ready.");

app.Run();


// -------------------- DB MIGRATION --------------------
static async Task ApplyMigrationsWithRepairAsync(WebApplication application, ILogger startupLog)
{
    await using var scope = application.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        startupLog.LogWarning(ex, "Migration failed, falling back to EnsureCreated");

        try
        {
            db.Database.EnsureCreated();
        }
        catch (Exception ex2)
        {
            startupLog.LogError(ex2, "EnsureCreated also failed");
        }
    }
}