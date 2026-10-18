using System.Net;
using System.Net.Http.Json;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MediPlanVoice.Tests;

public sealed class AlternativenControllerTests
{
    [Fact]
    public async Task FindetFreieRaumalternative()
    {
        await using var test = await ErstelleTestkontextAsync();

        var ergebnis = await SucheAsync(test.Client, RaumAnfrage(1));

        Assert.True(ergebnis.AlternativenGefunden);
        Assert.Contains(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == 2);
    }

    [Fact]
    public async Task SchlaegtBelegtenRaumNichtVor()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, 2);

        var ergebnis = await SucheAsync(test.Client, RaumAnfrage(1));

        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == 2);
    }

    [Fact]
    public async Task SchlaegtInaktivenRaumNichtVor()
    {
        await using var test = await ErstelleTestkontextAsync();
        var aendern = await test.Client.PutAsJsonAsync("/api/raeume/2", new RaumAendernVertrag
        {
            Name = "Untersuchungsraum",
            Standort = "Hauptgebaeude",
            Kapazitaet = 3,
            Aktiv = false
        });
        Assert.Equal(HttpStatusCode.OK, aendern.StatusCode);

        var ergebnis = await SucheAsync(test.Client, RaumAnfrage(1));

        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == 2);
    }

    [Fact]
    public async Task SchlaegtUrspruenglichenRaumNichtErneutVor()
    {
        await using var test = await ErstelleTestkontextAsync();

        var ergebnis = await SucheAsync(test.Client, RaumAnfrage(1));

        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == 1);
    }

    [Fact]
    public async Task BevorzugtRaumAmGleichenStandort()
    {
        await using var test = await ErstelleTestkontextAsync();

        var ergebnis = await SucheAsync(test.Client, RaumAnfrage(1));

        var standorte = ergebnis.Vorschlaege.Select(vorschlag => vorschlag.Standort).ToList();
        Assert.Equal("Hauptgebäude", standorte[0]);
        Assert.Contains("Nebengebäude", standorte);
        Assert.True(standorte.LastIndexOf("Hauptgebäude") < standorte.IndexOf("Nebengebäude"));
    }

    [Fact]
    public async Task FindetFreieGeraetealternative()
    {
        await using var test = await ErstelleTestkontextAsync();
        var ersatz = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet 2", "Bildgebung", "Hauptgebaeude");

        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(1));

        Assert.Contains(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == ersatz.Id);
    }

    [Fact]
    public async Task SchlaegtBelegteOderInaktiveGeraeteNichtVor()
    {
        await using var test = await ErstelleTestkontextAsync();
        var belegtesGeraet = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet 2", "Bildgebung", "Hauptgebaeude");
        var inaktivesGeraet = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet 3", "Bildgebung", "Hauptgebaeude");
        await LegeBuchungAnAsync(test.Client, 2, belegtesGeraet.Id);
        var aendern = await test.Client.PutAsJsonAsync($"/api/medizingeraete/{inaktivesGeraet.Id}", new MedizingeraetAendernVertrag
        {
            Name = inaktivesGeraet.Name,
            Geraetetyp = inaktivesGeraet.Geraetetyp,
            Standort = inaktivesGeraet.Standort,
            Aktiv = false
        });
        Assert.Equal(HttpStatusCode.OK, aendern.StatusCode);

        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(1));

        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == belegtesGeraet.Id);
        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == inaktivesGeraet.Id);
    }

    [Fact]
    public async Task SchlaegtNurGeraeteDesgleichenTypsVor()
    {
        await using var test = await ErstelleTestkontextAsync();
        var passendesGeraet = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet 2", "Bildgebung", "Hauptgebaeude");
        var falscherTyp = await LegeGeraetAnAsync(test.Client, "Endoskop", "Endoskopie", "Hauptgebaeude");

        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(1));

        Assert.Contains(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == passendesGeraet.Id);
        Assert.DoesNotContain(ergebnis.Vorschlaege, vorschlag => vorschlag.Id == falscherTyp.Id);
    }

    [Fact]
    public async Task BevorzugtGeraetAmGleichenStandort()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet Aussen", "Bildgebung", "Nebengebäude");
        var gleichesHaus = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet Haupt", "Bildgebung", "Hauptgebäude");

        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(1));

        Assert.Equal(gleichesHaus.Id, ergebnis.Vorschlaege[0].Id);
    }

    [Fact]
    public async Task BegruendungEntsprichtStandortTypUndVerfuegbarkeit()
    {
        await using var test = await ErstelleTestkontextAsync();
        var ersatz = await LegeGeraetAnAsync(test.Client, "Ultraschallgeraet 2", "Bildgebung", "Hauptgebäude");

        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(1));

        var vorschlag = Assert.Single(ergebnis.Vorschlaege, eintrag => eintrag.Id == ersatz.Id);
        Assert.Contains("Im angefragten Zeitraum verfügbar.", vorschlag.Gruende);
        Assert.Contains("Gleicher Standort.", vorschlag.Gruende);
        Assert.Contains("Gleicher Gerätetyp.", vorschlag.Gruende);
    }

    [Fact]
    public async Task MeldetWennKeinePassendeAlternativeVerfuegbarIst()
    {
        await using var test = await ErstelleTestkontextAsync();

        // Das Beatmungsgerät ist das einzige Seed-Gerät vom Typ „Beatmung“.
        var ergebnis = await SucheAsync(test.Client, GeraeteAnfrage(9));

        Assert.True(ergebnis.AnfrageGueltig);
        Assert.False(ergebnis.AlternativenGefunden);
        Assert.Empty(ergebnis.Vorschlaege);
        Assert.NotNull(ergebnis.Hinweis);
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

    private static async Task<BuchungZurueckgebenVertrag> LegeBuchungAnAsync(HttpClient client, int raumId, params int[] geraeteIds)
    {
        var antwort = await client.PostAsJsonAsync("/api/buchungen", new BuchungAnlegenVertrag
        {
            Titel = "Belegung",
            Beginn = Zeitpunkt(10),
            Ende = Zeitpunkt(11),
            RaumId = raumId,
            MedizingeraetIds = geraeteIds.ToList()
        });
        Assert.Equal(HttpStatusCode.Created, antwort.StatusCode);
        var buchung = await antwort.Content.ReadFromJsonAsync<BuchungZurueckgebenVertrag>();
        Assert.NotNull(buchung);
        return buchung;
    }

    private static async Task<MedizingeraetZurueckgebenVertrag> LegeGeraetAnAsync(
        HttpClient client,
        string name,
        string typ,
        string standort)
    {
        var antwort = await client.PostAsJsonAsync("/api/medizingeraete", new MedizingeraetAnlegenVertrag
        {
            Name = name,
            Geraetetyp = typ,
            Standort = standort
        });
        Assert.Equal(HttpStatusCode.Created, antwort.StatusCode);
        var geraet = await antwort.Content.ReadFromJsonAsync<MedizingeraetZurueckgebenVertrag>();
        Assert.NotNull(geraet);
        return geraet;
    }

    private static async Task<AlternativenErgebnisVertrag> SucheAsync(HttpClient client, AlternativenAnfrageVertrag anfrage)
    {
        var antwort = await client.PostAsJsonAsync("/api/buchungen/alternativen", anfrage);
        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        var ergebnis = await antwort.Content.ReadFromJsonAsync<AlternativenErgebnisVertrag>();
        Assert.NotNull(ergebnis);
        return ergebnis;
    }

    private static AlternativenAnfrageVertrag RaumAnfrage(int raumId)
    {
        return new AlternativenAnfrageVertrag { Beginn = Zeitpunkt(10), Ende = Zeitpunkt(11), RaumId = raumId };
    }

    private static AlternativenAnfrageVertrag GeraeteAnfrage(int geraetId)
    {
        return new AlternativenAnfrageVertrag { Beginn = Zeitpunkt(10), Ende = Zeitpunkt(11), MedizingeraetId = geraetId };
    }

    private static DateTimeOffset Zeitpunkt(int stunde)
    {
        return new DateTimeOffset(2026, 10, 10, stunde, 0, 0, TimeSpan.Zero);
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