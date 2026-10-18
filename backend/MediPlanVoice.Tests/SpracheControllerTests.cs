using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MediPlanVoice.Tests;

public sealed class SpracheControllerTests
{
    private static readonly byte[] Beispielaudio = [0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x02, 0x03];

    [Fact]
    public async Task AufnahmeWirdInTextUmgewandelt()
    {
        var spracherkennung = new FakeSpracherkennung { Ergebnis = "  Buche morgen von 10 bis 11 Uhr den Untersuchungsraum.  " };
        await using var test = await ErstelleTestkontextAsync(spracherkennung);

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, "audio/webm;codecs=opus");

        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        var ergebnis = await antwort.Content.ReadFromJsonAsync<TranskriptionZurueckgebenVertrag>();
        Assert.Equal("Buche morgen von 10 bis 11 Uhr den Untersuchungsraum.", ergebnis?.Text);
        Assert.Equal(Beispielaudio, spracherkennung.EmpfangenesAudio);
        Assert.Equal("audio/webm", Audioformate.Normalisiere(spracherkennung.EmpfangenerInhaltstyp));
    }

    [Fact]
    public async Task AntwortEnthaeltNurDenText()
    {
        await using var test = await ErstelleTestkontextAsync(new FakeSpracherkennung { Ergebnis = "Hallo" });

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, "audio/webm");

        Assert.Equal("""{"text":"Hallo"}""", await antwort.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task FehlendeAudiodateiWirdAbgelehnt()
    {
        var spracherkennung = new FakeSpracherkennung();
        await using var test = await ErstelleTestkontextAsync(spracherkennung);
        using var formular = new MultipartFormDataContent { { new StringContent("kein Audio"), "text" } };

        var antwort = await test.Client.PostAsync("/api/sprache/transkribieren", formular);

        await PruefeFehlerAsync(antwort, HttpStatusCode.BadRequest, "keine Audiodatei");
        Assert.False(spracherkennung.WurdeAufgerufen);
    }

    [Fact]
    public async Task LeereAudiodateiWirdAbgelehnt()
    {
        var spracherkennung = new FakeSpracherkennung();
        await using var test = await ErstelleTestkontextAsync(spracherkennung);

        var antwort = await SendeAudioAsync(test.Client, [], "audio/webm");

        await PruefeFehlerAsync(antwort, HttpStatusCode.BadRequest, "leer");
        Assert.False(spracherkennung.WurdeAufgerufen);
    }

    [Theory]
    [InlineData("text/plain")]
    [InlineData("video/mp4")]
    [InlineData("application/octet-stream")]
    public async Task NichtUnterstuetztesFormatWirdAbgelehnt(string inhaltstyp)
    {
        var spracherkennung = new FakeSpracherkennung();
        await using var test = await ErstelleTestkontextAsync(spracherkennung);

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, inhaltstyp);

        await PruefeFehlerAsync(antwort, HttpStatusCode.UnsupportedMediaType, "nicht unterstützt");
        Assert.False(spracherkennung.WurdeAufgerufen);
    }

    [Fact]
    public async Task NichtVerfuegbarerDienstLiefert503()
    {
        var spracherkennung = new FakeSpracherkennung
        {
            Ausnahme = new SpracherkennungNichtVerfuegbarAusnahme("Der Spracherkennungsdienst ist zurzeit nicht verfügbar."),
        };
        await using var test = await ErstelleTestkontextAsync(spracherkennung);

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, "audio/webm");

        await PruefeFehlerAsync(antwort, HttpStatusCode.ServiceUnavailable, "nicht verfügbar");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task OhneErkanntenTextLiefert422(string ergebnis)
    {
        await using var test = await ErstelleTestkontextAsync(new FakeSpracherkennung { Ergebnis = ergebnis });

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, "audio/ogg");

        await PruefeFehlerAsync(antwort, HttpStatusCode.UnprocessableEntity, "kein Text erkannt");
    }

    [Fact]
    public async Task TranskriptionLegtKeineBuchungAn()
    {
        await using var test = await ErstelleTestkontextAsync(new FakeSpracherkennung
        {
            Ergebnis = "Buche morgen von 10 bis 11 Uhr den Untersuchungsraum zur Routinekontrolle.",
        });

        var antwort = await SendeAudioAsync(test.Client, Beispielaudio, "audio/webm");
        var buchungen = await test.Client.GetFromJsonAsync<List<BuchungZurueckgebenVertrag>>("/api/buchungen");

        Assert.Equal(HttpStatusCode.OK, antwort.StatusCode);
        Assert.Empty(buchungen!);
    }

    private static async Task<HttpResponseMessage> SendeAudioAsync(HttpClient client, byte[] audio, string inhaltstyp)
    {
        var datei = new ByteArrayContent(audio);
        datei.Headers.ContentType = MediaTypeHeaderValue.Parse(inhaltstyp);
        using var formular = new MultipartFormDataContent { { datei, "audio", "aufnahme.webm" } };
        return await client.PostAsync("/api/sprache/transkribieren", formular);
    }

    private static async Task PruefeFehlerAsync(HttpResponseMessage antwort, HttpStatusCode erwarteterStatus, string erwarteterHinweis)
    {
        Assert.Equal(erwarteterStatus, antwort.StatusCode);
        var problem = await antwort.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains(erwarteterHinweis, problem?.Detail ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<TestKontext> ErstelleTestkontextAsync(FakeSpracherkennung spracherkennung)
    {
        var basis = new MediPlanWebApplicationFactory();
        var fabrik = basis.WithWebHostBuilder(builder => builder.ConfigureTestServices(dienste =>
        {
            dienste.RemoveAll<ISpracherkennungsService>();
            dienste.AddSingleton<ISpracherkennungsService>(spracherkennung);
        }));
        var client = fabrik.CreateClient();
        await using (var bereich = fabrik.Services.CreateAsyncScope())
        {
            await bereich.ServiceProvider.GetRequiredService<MediPlanDatenbankkontext>().Database.MigrateAsync();
        }

        return new TestKontext(basis, fabrik, client);
    }

    private sealed class TestKontext(
        MediPlanWebApplicationFactory basis,
        WebApplicationFactory<Program> fabrik,
        HttpClient client) : IAsyncDisposable
    {
        public HttpClient Client { get; } = client;

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await fabrik.DisposeAsync();
            await basis.DisposeAsync();
        }
    }

    private sealed class FakeSpracherkennung : ISpracherkennungsService
    {
        public string Ergebnis { get; init; } = "erkannter Text";

        public Exception? Ausnahme { get; init; }

        public bool WurdeAufgerufen { get; private set; }

        public byte[]? EmpfangenesAudio { get; private set; }

        public string? EmpfangenerInhaltstyp { get; private set; }

        public async Task<string> ErkenneTextAsync(Stream audio, string inhaltstyp, CancellationToken cancellationToken)
        {
            WurdeAufgerufen = true;
            using var puffer = new MemoryStream();
            await audio.CopyToAsync(puffer, cancellationToken);
            EmpfangenesAudio = puffer.ToArray();
            EmpfangenerInhaltstyp = inhaltstyp;
            if (Ausnahme is not null) throw Ausnahme;
            return Ergebnis;
        }
    }
}
