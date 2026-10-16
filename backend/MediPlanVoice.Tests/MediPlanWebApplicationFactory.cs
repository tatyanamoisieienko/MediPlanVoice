using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MediPlanVoice.Tests;

public sealed class MediPlanWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _verbindung = new("Data Source=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _verbindung.Open();

        builder.ConfigureTestServices(dienste =>
        {
            dienste.RemoveAll<MediPlanDatenbankkontext>();
            dienste.RemoveAll<DbContextOptions<MediPlanDatenbankkontext>>();
            dienste.AddDbContext<MediPlanDatenbankkontext>(optionen => optionen.UseSqlite(_verbindung));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _verbindung.Dispose();
        }
    }
}