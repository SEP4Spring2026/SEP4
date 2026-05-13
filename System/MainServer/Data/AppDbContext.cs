using MainServer.Models;
using Microsoft.EntityFrameworkCore;

namespace MainServer.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SensorDevice> Sensors => Set<SensorDevice>();
    public DbSet<SensorReading> Readings => Set<SensorReading>();
    public DbSet<Prediction> Predictions => Set<Prediction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SensorDevice>().HasKey(s => s.SensorId);
        modelBuilder.Entity<SensorDevice>()
            .Property(s => s.SensorId)
            .ValueGeneratedNever();
        modelBuilder.Entity<SensorReading>().HasKey(r => r.ReadingId);

        modelBuilder.Entity<SensorReading>()
            .HasOne(r => r.Sensor)
            .WithMany(s => s.Readings)
            .HasForeignKey(r => r.SensorId);

        modelBuilder.Entity<Prediction>()
            .HasOne(p => p.Reading)
            .WithOne(r => r.Prediction!)
            .HasForeignKey<Prediction>(p => p.ReadingId);
    }
}
