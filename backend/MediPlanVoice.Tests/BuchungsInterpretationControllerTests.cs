using System.Net;
using System.Net.Http.Json;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MediPlanVoice.Tests;

public sealed class BuchungsInterpretationControllerTests
{
    [Fact]
    public async Task VollstaendigerTextErzeugtEntwurfMitBekanntenRessourcen()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client,
            "Buche morgen von 10 bis 11 Uhr den Untersuchungsraum mit Ultraschall zur Routinekontrolle");

        Assert.Equal("Routinekontrolle", entwurf.TitelOderZweck);
        Assert.Equal(DateOnly.FromDateTime(TimeProvider.System.GetLocalNow().DateTime).AddDays(1), entwurf.Datum);
        Assert.Equal(new TimeOnly(10, 0), entwurf.Beginn);
        Assert.Equal(new TimeOnly(11, 0), entwurf.Ende);
        Assert.Equal(60, entwurf.DauerMinuten);
        Assert.Equal(2, entwurf.Raum?.Id);
        Assert.Contains(entwurf.Medizingeraete, geraet => geraet.Id == 1);
        Assert.Empty(entwurf.FehlendeAngaben);
        Assert.Empty(entwurf.UnsichereAngaben);
    }

    [Fact]
    public async Task FehlendeUhrzeitBleibtLeerUndWirdAlsFehlendMarkiert()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client, "Buche morgen einen Untersuchungsraum zur Kontrolle");

        Assert.Null(entwurf.Beginn);
        Assert.Null(entwurf.Ende);
        Assert.Contains("Beginn", entwurf.FehlendeAngaben);
        Assert.Contains("Ende", entwurf.FehlendeAngaben);
    }

    [Fact]
    public async Task FehlendesDatumWirdNichtErgaenzt()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client, "Buche von 10 bis 11 Uhr den Untersuchungsraum zur Kontrolle");

        Assert.Null(entwurf.Datum);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
    }

    [Fact]
    public async Task FehlenderRaumBleibtOffen()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client, "Buche morgen von 10 bis 11 Uhr mit Ultraschall zur Kontrolle");

        Assert.Null(entwurf.Raum);
        Assert.Contains("Raum", entwurf.FehlendeAngaben);
        Assert.Contains(entwurf.Medizingeraete, geraet => geraet.Id == 1);
    }

    [Fact]
    public async Task UnbekanntesMedizingeraetWirdNichtAutomatischZugeordnet()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client,
            "Buche morgen von 10 bis 11 Uhr den Untersuchungsraum mit Röntgengerät zur Kontrolle");

        Assert.Empty(entwurf.Medizingeraete);
        Assert.Contains("Medizingeraet", entwurf.FehlendeAngaben);
        Assert.Contains(entwurf.UnsichereAngaben, angabe => angabe.Contains("Röntgengerät", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task UnbekannterRaumWirdAlsUnsicherMarkiert()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client,
            "Buche morgen von 10 bis 11 Uhr Raum Zeta zur Kontrolle");

        Assert.Null(entwurf.Raum);
        Assert.Contains("Raum", entwurf.FehlendeAngaben);
        Assert.Contains(entwurf.UnsichereAngaben, angabe => angabe.Contains("Zeta", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task BekannteRessourceWirdEindeutigErkannt()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client, "Untersuchungsraum mit Ultraschall");

        Assert.Equal(new BuchungsEntwurfRessourceVertrag(2, "Untersuchungsraum"), entwurf.Raum);
        Assert.Contains(new BuchungsEntwurfRessourceVertrag(1, "Ultraschallgeraet"), entwurf.Medizingeraete);
    }

    [Fact]
    public async Task UnvollstaendigeEingabeErzeugtEntwurfAberKeineBuchung()
    {
        await using var test = await ErstelleTestkontextAsync();
        var vorher = await HoleBuchungenAsync(test.Client);

        var antwort = await test.Client.PostAsJsonAsync("/api/buchungsentwuerfe/interpretieren",
            new TexteingabeInterpretierenVertrag { Text = "Buche irgendwann" });
        var entwurf = await antwort.Content.ReadFromJsonAsync<BuchungsEntwurfZurueckgebenVertrag>();
        var danach = await HoleBuchungenAsync(test.Client);

        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        Assert.NotNull(entwurf);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
        Assert.Contains("Beginn", entwurf.FehlendeAngaben);
        Assert.Contains("Raum", entwurf.FehlendeAngaben);
        Assert.Equal(vorher.Select(buchung => buchung.Id), danach.Select(buchung => buchung.Id));
    }

    [Fact]
    public async Task InterpretationVeraendertKeineVorhandenenBuchungen()
    {
        await using var test = await ErstelleTestkontextAsync();
        var anlegen = await test.Client.PostAsJsonAsync("/api/buchungen", new BuchungAnlegenVertrag
        {
            Titel = "Bestehende Buchung",
            Beginn = new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero),
            Ende = new DateTimeOffset(2026, 12, 1, 11, 0, 0, TimeSpan.Zero),
            RaumId = 1
        });
        Assert.Equal(HttpStatusCode.Created, anlegen.StatusCode);
        var vorher = await HoleBuchungenAsync(test.Client);

        var entwurf = await InterpretiereAsync(test.Client,
            "Buche morgen von 10 bis 11 Uhr den Untersuchungsraum zur Routinekontrolle");
        var danach = await HoleBuchungenAsync(test.Client);

        Assert.NotNull(entwurf);
        Assert.Equal(vorher.Select(buchung => buchung.Id), danach.Select(buchung => buchung.Id));
        Assert.Equal("Bestehende Buchung", danach.Single().Titel);
    }

    [Fact]
    public async Task NichtErkanntePflichtangabenWerdenNichtErfunden()
    {
        await using var test = await ErstelleTestkontextAsync();

        var entwurf = await InterpretiereAsync(test.Client, "Buche von 10 bis 11 Uhr für Kontrolle");

        Assert.Equal("Kontrolle", entwurf.TitelOderZweck);
        Assert.Null(entwurf.Datum);
        Assert.Null(entwurf.Raum);
        Assert.Empty(entwurf.Medizingeraete);
        Assert.Contains("Datum", entwurf.FehlendeAngaben);
        Assert.Contains("Raum", entwurf.FehlendeAngaben);
    }

    private static async Task<BuchungsEntwurfZurueckgebenVertrag> InterpretiereAsync(HttpClient client, string text)
    {
        var antwort = await client.PostAsJsonAsync("/api/buchungsentwuerfe/interpretieren",
            new TexteingabeInterpretierenVertrag { Text = text });
        var inhalt = await antwort.Content.ReadAsStringAsync();
        Assert.True(antwort.StatusCode == HttpStatusCode.OK, $"HTTP {(int)antwort.StatusCode}: {inhalt}");
        var entwurf = System.Text.Json.JsonSerializer.Deserialize<BuchungsEntwurfZurueckgebenVertrag>(inhalt,
            new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
        Assert.NotNull(entwurf);
        return entwurf;
    }

    private static async Task<List<BuchungZurueckgebenVertrag>> HoleBuchungenAsync(HttpClient client)
    {
        var buchungen = await client.GetFromJsonAsync<List<BuchungZurueckgebenVertrag>>("/api/buchungen");
        Assert.NotNull(buchungen);
        return buchungen;
    }

    private static async Task<TestKontext> ErstelleTestkontextAsync()
    {
        var fabrik = new MediPlanWebApplicationFactory();
        var client = fabrik.CreateClient();
        try
        {
            await using var bereich = fabrik.Services.CreateAsyncScope();
            var datenbank = bereich.ServiceProvider.GetRequiredService<MediPlanDatenbankkontext>();
            await datenbank.Database.MigrateAsync();
            return new TestKontext(fabrik, client);
        }
        catch
        {
            client.Dispose();
            await fabrik.DisposeAsync();
            throw;
        }
    }

    private sealed class TestKontext(MediPlanWebApplicationFactory fabrik, HttpClient client) : IAsyncDisposable
    {
        public HttpClient Client { get; } = client;

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await fabrik.DisposeAsync();
        }
    }
}