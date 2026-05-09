using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MainServer.Data;

/// <summary>
/// Recovers from VPS drift where tables were created via EnsureCreated or an older image while
/// EF migrations never completed — e.g. InitialCreate fails with "table already exists", leaving
/// Readings without payload columns and migrations history out of sync.
/// </summary>
public static class DbSchemaRepair
{
    private const string InitialMigrationId = "20260426163652_InitialCreate";
    private const string PayloadMigrationId = "20260508163226_AddSensorPayloadFields";
    private const string EfProductVersion = "9.0.0";

    public static async Task RepairAfterMigrateFailureAsync(
        AppDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        await EnsureReadingsPayloadColumnsAsync(db, logger, cancellationToken).ConfigureAwait(false);

        if (await TableExistsAsync(db, "Sensors", cancellationToken).ConfigureAwait(false)
            && !await MigrationAppliedAsync(db, InitialMigrationId, cancellationToken).ConfigureAwait(false))
        {
            await InsertBaselineRowAsync(db, logger, InitialMigrationId, cancellationToken)
                .ConfigureAwait(false);
        }

        if (await MigrationAppliedAsync(db, InitialMigrationId, cancellationToken).ConfigureAwait(false)
            && await TableExistsAsync(db, "Readings", cancellationToken).ConfigureAwait(false)
            && !await MigrationAppliedAsync(db, PayloadMigrationId, cancellationToken).ConfigureAwait(false))
        {
            await InsertBaselineRowAsync(db, logger, PayloadMigrationId, cancellationToken)
                .ConfigureAwait(false);
        }
    }

    private static async Task EnsureReadingsPayloadColumnsAsync(
        AppDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "Readings", cancellationToken).ConfigureAwait(false))
            return;

        (string Name, string Definition)[] columns =
        [
            ("SmokeLevel", "DOUBLE NULL"),
            ("Tvoc", "DOUBLE NULL"),
            ("Eco2", "DOUBLE NULL"),
            ("Aqi", "INT NULL"),
            ("Classification", "LONGTEXT NULL"),
        ];

        foreach (var (name, definition) in columns)
        {
            if (await ColumnExistsAsync(db, "Readings", name, cancellationToken).ConfigureAwait(false))
                continue;

            logger.LogWarning("Adding missing column Readings.{Column}", name);
            await db.Database.ExecuteSqlRawAsync(
                    $@"ALTER TABLE `Readings` ADD COLUMN `{name}` {definition}",
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }
    }

    private static async Task InsertBaselineRowAsync(
        AppDbContext db,
        ILogger logger,
        string migrationId,
        CancellationToken cancellationToken)
    {
        if (migrationId == PayloadMigrationId)
        {
            logger.LogWarning(
                "Baselining EF migration {MigrationId}: payload columns reconciled for legacy database.",
                migrationId);
        }
        else
        {
            logger.LogWarning(
                "Baselining EF migration {MigrationId}: tables already existed outside migrations.",
                migrationId);
        }

        await db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                 INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                 VALUES ({migrationId}, {EfProductVersion})
                 """,
                cancellationToken: cancellationToken)
            .ConfigureAwait(false);
    }

    private static async Task<bool> TableExistsAsync(
        AppDbContext db,
        string tableName,
        CancellationToken cancellationToken)
    {
        await db.Database.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = """
                              SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
                              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @t
                              """;
            var p = cmd.CreateParameter();
            p.ParameterName = "@t";
            p.Value = tableName;
            cmd.Parameters.Add(p);

            var scalar = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            return Convert.ToInt64(scalar) > 0;
        }
        finally
        {
            await db.Database.CloseConnectionAsync().ConfigureAwait(false);
        }
    }

    private static async Task<bool> ColumnExistsAsync(
        AppDbContext db,
        string tableName,
        string columnName,
        CancellationToken cancellationToken)
    {
        await db.Database.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = """
                              SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                              WHERE TABLE_SCHEMA = DATABASE()
                                AND TABLE_NAME = @table
                                AND COLUMN_NAME = @column
                              """;
            var p1 = cmd.CreateParameter();
            p1.ParameterName = "@table";
            p1.Value = tableName;
            var p2 = cmd.CreateParameter();
            p2.ParameterName = "@column";
            p2.Value = columnName;
            cmd.Parameters.Add(p1);
            cmd.Parameters.Add(p2);

            var scalar = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            return Convert.ToInt64(scalar) > 0;
        }
        finally
        {
            await db.Database.CloseConnectionAsync().ConfigureAwait(false);
        }
    }

    private static async Task<bool> MigrationAppliedAsync(
        AppDbContext db,
        string migrationId,
        CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "__EFMigrationsHistory", cancellationToken).ConfigureAwait(false))
            return false;

        await db.Database.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var cmd = db.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = """
                              SELECT COUNT(*) FROM `__EFMigrationsHistory`
                              WHERE `MigrationId` = @id
                              """;
            var p = cmd.CreateParameter();
            p.ParameterName = "@id";
            p.Value = migrationId;
            cmd.Parameters.Add(p);

            var scalar = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            return Convert.ToInt64(scalar) > 0;
        }
        finally
        {
            await db.Database.CloseConnectionAsync().ConfigureAwait(false);
        }
    }
}
