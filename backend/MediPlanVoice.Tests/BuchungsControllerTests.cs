using System.Net;
using System.Net.Http.Json;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MediPlanVoice.Tests;

public sealed class BuchungsControllerTests
{
    [Fact]
    public async Task PrueftZeitraumOhneUeberschneidungAlsVerfuegbar()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(12), Zeitpunkt(13)));

        Assert.True(ergebnis.AnfrageGueltig);
        Assert.True(ergebnis.Verfuegbar);
        Assert.Empty(ergebnis.Konflikte);
    }

    [Fact]
    public async Task ErkenntTeilweiseUeberlappendeBuchungen()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(10, 30), Zeitpunkt(11, 30)));

        Assert.False(ergebnis.Verfuegbar);
        Assert.Contains(ergebnis.Konflikte, konflikt => konflikt.RessourceTyp == "Raum");
    }

    [Fact]
    public async Task ErkenntIdentischeZeitraeumeAlsKonflikt()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(10), Zeitpunkt(11)));

        Assert.False(ergebnis.Verfuegbar);
        Assert.Single(ergebnis.Konflikte);
    }

    [Fact]
    public async Task DirektAngrenzendeBuchungenSindKeinKonflikt()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(11), Zeitpunkt(12)));

        Assert.True(ergebnis.Verfuegbar);
        Assert.Empty(ergebnis.Konflikte);
    }

    [Fact]
    public async Task MeldetRaumAlsKonfliktursache()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(10, 15), Zeitpunkt(10, 45)));

        var konflikt = Assert.Single(ergebnis.Konflikte);
        Assert.Equal("Raum", konflikt.RessourceTyp);
        Assert.Equal(1, konflikt.RessourceId);
        Assert.Equal("Behandlungsraum 1", konflikt.RessourcenName);
    }

    [Fact]
    public async Task MeldetMedizingeraetAlsKonfliktursache()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11), 1));

        var ergebnis = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(2, Zeitpunkt(10, 15), Zeitpunkt(10, 45), 1));

        var konflikt = Assert.Single(ergebnis.Konflikte);
        Assert.Equal("Medizingeraet", konflikt.RessourceTyp);
        Assert.Equal(1, konflikt.RessourceId);
        Assert.Equal("Ultraschallgerät", konflikt.RessourcenName);
    }

    [Fact]
    public async Task AenderungDerBuchungErzeugtKeinenSelbstkonflikt()
    {
        await using var test = await ErstelleTestkontextAsync();
        var buchung = await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var antwort = await test.Client.PutAsJsonAsync($"/api/buchungen/{buchung.Id}", Aenderung(1, Zeitpunkt(10), Zeitpunkt(11)));

        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
    }

    [Fact]
    public async Task AenderungMitKonfliktZuAndererBuchungWirdAbgelehnt()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));
        var zuAendern = await LegeBuchungAnAsync(test.Client, Anfrage(2, Zeitpunkt(12), Zeitpunkt(13)));

        var antwort = await test.Client.PutAsJsonAsync($"/api/buchungen/{zuAendern.Id}", Aenderung(1, Zeitpunkt(10, 30), Zeitpunkt(11, 30)));

        Assert.Equal(HttpStatusCode.Conflict, antwort.StatusCode);
        var ergebnis = await antwort.Content.ReadFromJsonAsync<VerfuegbarkeitsErgebnisVertrag>();
        Assert.NotNull(ergebnis);
        Assert.Contains(ergebnis.Konflikte, konflikt => konflikt.BuchungId != zuAendern.Id);
    }

    [Fact]
    public async Task UngueltigerZeitraumWirdAbgelehnt()
    {
        await using var test = await ErstelleTestkontextAsync();

        var antwort = await test.Client.PostAsJsonAsync("/api/buchungen", Anfrage(1, Zeitpunkt(11), Zeitpunkt(10)));

        Assert.Equal(HttpStatusCode.BadRequest, antwort.StatusCode);
        var buchungen = await test.Client.GetFromJsonAsync<List<BuchungZurueckgebenVertrag>>("/api/buchungen");
        Assert.Empty(buchungen!);
    }

    [Fact]
    public async Task KonfliktSpeichertKeineNeueBuchung()
    {
        await using var test = await ErstelleTestkontextAsync();
        await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var antwort = await test.Client.PostAsJsonAsync("/api/buchungen", Anfrage(1, Zeitpunkt(10, 30), Zeitpunkt(11, 30)));

        Assert.Equal(HttpStatusCode.Conflict, antwort.StatusCode);
        var buchungen = await test.Client.GetFromJsonAsync<List<BuchungZurueckgebenVertrag>>("/api/buchungen");
        Assert.Single(buchungen!);
    }

    [Fact]
    public async Task VerfuegbarkeitspruefungBeimBearbeitenSchliesstEigeneBuchungAus()
    {
        await using var test = await ErstelleTestkontextAsync();
        var buchung = await LegeBuchungAnAsync(test.Client, Anfrage(1, Zeitpunkt(10), Zeitpunkt(11)));

        var ohneAusschluss = await PruefeAsync(test.Client, AnfrageVerfuegbarkeit(1, Zeitpunkt(10), Zeitpunkt(11)));
        var mitAusschluss = await test.Client.PostAsJsonAsync("/api/buchungen/verfuegbarkeit", new VerfuegbarkeitPruefenVertrag
        {
            Beginn = Zeitpunkt(10),
            Ende = Zeitpunkt(11),
            RaumId = 1,
            AuszuschliessendeBuchungId = buchung.Id
        });
        var ergebnis = await mitAusschluss.Content.ReadFromJsonAsync<VerfuegbarkeitsErgebnisVertrag>();

        Assert.False(ohneAusschluss.Verfuegbar);
        Assert.Equal(HttpStatusCode.OK, mitAusschluss.StatusCode);
        Assert.NotNull(ergebnis);
        Assert.True(ergebnis.Verfuegbar);
    }

    [Fact]
    public async Task InaktiveRaeumeUndGeraeteWerdenAbgelehnt()
    {
        await using var test = await ErstelleTestkontextAsync();
        await test.Client.PutAsJsonAsync("/api/raeume/1", new RaumAendernVertrag
        {
            Name = "Behandlungsraum 1",
            Standort = "Hauptgebaeude",
            Kapazitaet = 2,
            Aktiv = false
        });
        await test.Client.PutAsJsonAsync("/api/medizingeraete/1", new MedizingeraetAendernVertrag
        {
            Name = "Ultraschallgerät",
            Geraetetyp = "Bildgebung",
            Standort = "Hauptgebaeude",
            Aktiv = false
        });

        var antwort = await test.Client.PostAsJsonAsync("/api/buchungen", Anfrage(1, Zeitpunkt(10), Zeitpunkt(11), 1));

        Assert.Equal(HttpStatusCode.BadRequest, antwort.StatusCode);
        var fehler = await antwort.Content.ReadAsStringAsync();
        Assert.Contains("nicht aktiv", fehler, StringComparison.OrdinalIgnoreCase);
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

    private static async Task<BuchungZurueckgebenVertrag> LegeBuchungAnAsync(HttpClient client, BuchungAnlegenVertrag vertrag)
    {
        var antwort = await client.PostAsJsonAsync("/api/buchungen", vertrag);
        Assert.Equal(HttpStatusCode.Created, antwort.StatusCode);
        var buchung = await antwort.Content.ReadFromJsonAsync<BuchungZurueckgebenVertrag>();
        Assert.NotNull(buchung);
        return buchung;
    }

    private static async Task<VerfuegbarkeitsErgebnisVertrag> PruefeAsync(HttpClient client, VerfuegbarkeitPruefenVertrag vertrag)
    {
        var antwort = await client.PostAsJsonAsync("/api/buchungen/verfuegbarkeit", vertrag);
        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        var ergebnis = await antwort.Content.ReadFromJsonAsync<VerfuegbarkeitsErgebnisVertrag>();
        Assert.NotNull(ergebnis);
        return ergebnis;
    }

    private static BuchungAnlegenVertrag Anfrage(int raumId, DateTimeOffset beginn, DateTimeOffset ende, params int[] medizingeraetIds)
    {
        return new BuchungAnlegenVertrag
        {
            Titel = "Testbuchung",
            Beginn = beginn,
            Ende = ende,
            RaumId = raumId,
            MedizingeraetIds = medizingeraetIds.ToList()
        };
    }

    private static BuchungAendernVertrag Aenderung(int raumId, DateTimeOffset beginn, DateTimeOffset ende)
    {
        return new BuchungAendernVertrag
        {
            Titel = "Geänderte Testbuchung",
            Beginn = beginn,
            Ende = ende,
            RaumId = raumId
        };
    }

    private static VerfuegbarkeitPruefenVertrag AnfrageVerfuegbarkeit(
        int raumId,
        DateTimeOffset beginn,
        DateTimeOffset ende,
        params int[] medizingeraetIds)
    {
        return new VerfuegbarkeitPruefenVertrag
        {
            Beginn = beginn,
            Ende = ende,
            RaumId = raumId,
            MedizingeraetIds = medizingeraetIds.ToList()
        };
    }

    private static DateTimeOffset Zeitpunkt(int stunde, int minute = 0)
    {
        return new DateTimeOffset(2026, 10, 10, stunde, minute, 0, TimeSpan.Zero);
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