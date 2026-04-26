using Kamtjatka.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kamtjatka.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Residence> Residences => Set<Residence>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<BuildingManager> BuildingManagers => Set<BuildingManager>();
    public DbSet<SystemAdmin> SystemAdmins => Set<SystemAdmin>();
    public DbSet<SensorDevice> SensorDevices => Set<SensorDevice>();
    public DbSet<SensorReading> SensorReadings => Set<SensorReading>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<FireEvent> FireEvents => Set<FireEvent>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<Recommendation> Recommendations => Set<Recommendation>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<DeviceCommand> DeviceCommands => Set<DeviceCommand>();
    public DbSet<SystemLog> SystemLogs => Set<SystemLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Residence>().ToTable("residences");
        modelBuilder.Entity<Room>().ToTable("rooms");
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<Resident>().ToTable("residents");
        modelBuilder.Entity<BuildingManager>().ToTable("building_managers");
        modelBuilder.Entity<SystemAdmin>().ToTable("system_admins");
        modelBuilder.Entity<SensorDevice>().ToTable("sensor_devices");
        modelBuilder.Entity<SensorReading>().ToTable("sensor_readings");
        modelBuilder.Entity<Prediction>().ToTable("predictions");
        modelBuilder.Entity<FireEvent>().ToTable("fire_events");
        modelBuilder.Entity<Alert>().ToTable("alerts");
        modelBuilder.Entity<Recommendation>().ToTable("recommendations");
        modelBuilder.Entity<IncidentReport>().ToTable("incident_reports");
        modelBuilder.Entity<DeviceCommand>().ToTable("device_commands");
        modelBuilder.Entity<SystemLog>().ToTable("system_logs");

        modelBuilder.Entity<Residence>().HasKey(x => x.ResidenceId);
        modelBuilder.Entity<Room>().HasKey(x => x.RoomId);
        modelBuilder.Entity<User>().HasKey(x => x.UserId);
        modelBuilder.Entity<Resident>().HasKey(x => x.UserId);
        modelBuilder.Entity<BuildingManager>().HasKey(x => x.UserId);
        modelBuilder.Entity<SystemAdmin>().HasKey(x => x.UserId);
        modelBuilder.Entity<SensorDevice>().HasKey(x => x.SensorId);
        modelBuilder.Entity<SensorReading>().HasKey(x => x.ReadingId);
        modelBuilder.Entity<Prediction>().HasKey(x => x.PredictionId);
        modelBuilder.Entity<FireEvent>().HasKey(x => x.EventId);
        modelBuilder.Entity<Alert>().HasKey(x => x.AlertId);
        modelBuilder.Entity<Recommendation>().HasKey(x => x.RecommendationId);
        modelBuilder.Entity<IncidentReport>().HasKey(x => x.ReportId);
        modelBuilder.Entity<DeviceCommand>().HasKey(x => x.CommandId);
        modelBuilder.Entity<SystemLog>().HasKey(x => x.LogId);

        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<SensorDevice>().HasIndex(x => x.SerialNumber).IsUnique();

        modelBuilder.Entity<Room>()
            .HasOne(x => x.Residence)
            .WithMany(x => x.Rooms)
            .HasForeignKey(x => x.ResidenceId);

        modelBuilder.Entity<SensorDevice>()
            .HasOne(x => x.Room)
            .WithMany(x => x.SensorDevices)
            .HasForeignKey(x => x.RoomId);

        modelBuilder.Entity<SensorReading>()
            .HasOne(x => x.SensorDevice)
            .WithMany(x => x.SensorReadings)
            .HasForeignKey(x => x.SensorId);

        modelBuilder.Entity<Prediction>()
            .HasOne(x => x.SensorReading)
            .WithMany(x => x.Predictions)
            .HasForeignKey(x => x.ReadingId);

        modelBuilder.Entity<FireEvent>()
            .HasOne(x => x.Room)
            .WithMany(x => x.FireEvents)
            .HasForeignKey(x => x.RoomId);

        modelBuilder.Entity<FireEvent>()
            .HasOne(x => x.Prediction)
            .WithMany(x => x.FireEvents)
            .HasForeignKey(x => x.PredictionId);

        modelBuilder.Entity<Alert>()
            .HasOne(x => x.FireEvent)
            .WithMany(x => x.Alerts)
            .HasForeignKey(x => x.FireEventId);

        modelBuilder.Entity<Resident>()
            .HasOne(x => x.User)
            .WithOne(x => x.Resident)
            .HasForeignKey<Resident>(x => x.UserId);

        modelBuilder.Entity<BuildingManager>()
            .HasOne(x => x.User)
            .WithOne(x => x.BuildingManager)
            .HasForeignKey<BuildingManager>(x => x.UserId);

        modelBuilder.Entity<SystemAdmin>()
            .HasOne(x => x.User)
            .WithOne(x => x.SystemAdmin)
            .HasForeignKey<SystemAdmin>(x => x.UserId);
    }
}