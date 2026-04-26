using MainServer.Data;
using MainServer.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("Default");
var mlUrl = builder.Configuration["MlServer:Url"]!;
var dbHost = System.Text.RegularExpressions.Regex.Match(connectionString ?? "", @"Server=([^;]+)").Groups[1].Value;
Console.WriteLine($"[startup] DB host: {dbHost}");
Console.WriteLine($"[startup] ML URL : {mlUrl}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
);

builder.Services.AddHttpClient<MlClient>(client =>
{
    client.BaseAddress = new Uri(mlUrl);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.MapControllers();
app.Run();
