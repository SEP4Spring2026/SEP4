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
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(_ => true); // DEV ONLY (important)
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowFrontend");

app.MapControllers();
app.Run();
