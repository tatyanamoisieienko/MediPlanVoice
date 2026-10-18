using System.Net;
using System.Net.Http.Json;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MediPlanVoice.Tests;

/// <summary>Prüft die Datumsinterpretation mit dem festen Referenzdatum Sonntag, 18.10.2026.</summary>
public sealed class BuchungsInterpretationDatumTests
{
    [Theory]
    [InlineData("heute", "2026-10-18")]
    [InlineData("morgen", "2026-10-19")]
    [InlineData("übermorgen", "2026-10-20")]
    [InlineData("in 2 Tagen", "2026-10-20")]
    [InlineData("in drei Tagen", "2026-10-21")]
    [InlineData("in zwölf Tagen", "2026-10-30")]
    [InlineData("in einer Woche", "2026-10-25")]
    [InlineData("in 2 Wochen", "2026-11-01")]
    [InlineData("in einem Monat", "2026-11-18")]
    [InlineData("in 3 Monaten", "2027-01-18")]
    public async Task RelativeDatumsangabeWirdAusReferenzdatumBerechnet(string angabe, string erwartet)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} von 10 bis 11 Uhr den Untersuchungsraum 1 zur Kontrolle");

        Assert.Equal(DateOnly.Parse(erwartet), entwurf.Datum);
        Assert.DoesNotContain("Datum", entwurf.FehlendeAngaben);
    }

    [Theory]
    [InlineData("am 25. Oktober 2026", "2026-10-25")]
    [InlineData("am 25.10.2026", "2026-10-25")]
    [InlineData("25.10.2026", "2026-10-25")]
    [InlineData("am 5.1.2027", "2027-01-05")]
    [InlineData("2026-10-25", "2026-10-25")]
    public async Task KonkreteDatumsangabeWirdUebernommen(string angabe, string erwartet)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} den Untersuchungsraum 1 zur Kontrolle");

        Assert.Equal(DateOnly.Parse(erwartet), entwurf.Datum);
        Assert.DoesNotContain("Datum", entwurf.FehlendeAngaben);
    }

    [Theory]
    [InlineData("am 20. Oktober", "2026-10-20")]
    [InlineData("am 18. Oktober", "2026-10-18")]
    [InlineData("am 17. Oktober", "2027-10-17")]
    [InlineData("am 5. Januar", "2027-01-05")]
    [InlineData("am 3. März", "2027-03-03")]
    public async Task DatumOhneJahrNutztNaechstesBevorstehendesDatum(string angabe, string erwartet)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} von 10 bis 11 Uhr den Untersuchungsraum 1 zur Kontrolle");

        Assert.Equal(DateOnly.Parse(erwartet), entwurf.Datum);
    }

    [Theory]
    [InlineData("am 31.02.2027")]
    [InlineData("am 2027-02-31")]
    [InlineData("am 31. Februar")]
    [InlineData("am 32. Oktober 2026")]
    public async Task UngueltigesDatumWirdNichtUebernommen(string angabe)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} den Untersuchungsraum 1 zur Kontrolle");

        Assert.Null(entwurf.Datum);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
        Assert.Contains(entwurf.UnsichereAngaben, angabe => angabe.Contains("ungültig", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("in ein paar Tagen")]
    [InlineData("in zwanzig Tagen")]
    [InlineData("nächsten Montag")]
    public async Task NichtUnterstuetzteRelativeAngabeWirdNichtGeraten(string angabe)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} den Untersuchungsraum 1 zur Kontrolle");

        Assert.Null(entwurf.Datum);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
        Assert.Contains(entwurf.UnsichereAngaben, angabe => angabe.Contains("nicht unterstützt", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("morgen am 25. Oktober")]
    [InlineData("übermorgen oder in einer Woche")]
    public async Task MehrereDatumsangabenWerdenNichtZugeordnet(string angabe)
    {
        var entwurf = await InterpretiereAsync($"Buche {angabe} den Untersuchungsraum 1 zur Kontrolle");

        Assert.Null(entwurf.Datum);
        Assert.Contains(entwurf.UnsichereAngaben, angabe => angabe.StartsWith("Mehrere Datumsangaben", StringComparison.Ordinal));
    }

    [Fact]
    public async Task OhneDatumsangabeWirdKeinDatumErfunden()
    {
        var entwurf = await InterpretiereAsync("Buche von 10 bis 11 Uhr den Untersuchungsraum 1 zur Kontrolle");

        Assert.Null(entwurf.Datum);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
    }

    private static async Task<BuchungsEntwurfZurueckgebenVertrag> InterpretiereAsync(string text)
    {
        using var basis = new MediPlanWebApplicationFactory();
        using var fabrik = basis.WithWebHostBuilder(builder => builder.ConfigureTestServices(dienste =>
        {
            dienste.RemoveAll<TimeProvider>();
            dienste.AddSingleton<TimeProvider>(new FesteZeit(new DateTimeOffset(2026, 10, 18, 9, 0, 0, TimeSpan.Zero)));
        }));
        using var client = fabrik.CreateClient();
        await using (var bereich = fabrik.Services.CreateAsyncScope())
        {
            await bereich.ServiceProvider.GetRequiredService<MediPlanDatenbankkontext>().Database.MigrateAsync();
        }

        var antwort = await client.PostAsJsonAsync("/api/buchungsentwuerfe/interpretieren", new TexteingabeInterpretierenVertrag { Text = text });
        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        var entwurf = await antwort.Content.ReadFromJsonAsync<BuchungsEntwurfZurueckgebenVertrag>();
        Assert.NotNull(entwurf);
        return entwurf;
    }

    private sealed class FesteZeit(DateTimeOffset jetzt) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => jetzt;

        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }
}
