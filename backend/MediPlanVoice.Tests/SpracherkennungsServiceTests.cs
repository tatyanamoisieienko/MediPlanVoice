using System.Net;
using System.Text;
using MediPlanVoice.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace MediPlanVoice.Tests;

/// <summary>Prüft den Adapter zur externen Spracherkennung mit einem simulierten HTTP-Dienst.</summary>
public sealed class SpracherkennungsServiceTests
{
    [Fact]
    public async Task SendetAudioAufDeutschUndLiefertText()
    {
        var dienst = new SimulierterDienst(HttpStatusCode.OK, """{"text":" Buche morgen den Untersuchungsraum. "}""");
        var service = ErstelleService(dienst, "test-schluessel");

        var text = await service.ErkenneTextAsync(new MemoryStream([1, 2, 3]), "audio/webm;codecs=opus", CancellationToken.None);

        Assert.Equal("Buche morgen den Untersuchungsraum.", text);
        Assert.Equal("https://stt.example.test/v1/audio/transcriptions", dienst.Anfrage?.RequestUri?.ToString());
        Assert.Equal("Bearer test-schluessel", dienst.Anfrage?.Headers.Authorization?.ToString());
        Assert.Contains("name=language", dienst.Inhalt);
        Assert.Contains("\r\n\r\nde\r\n", dienst.Inhalt);
        Assert.Contains("name=model", dienst.Inhalt);
        Assert.Contains("filename=aufnahme.webm", dienst.Inhalt);
    }

    [Fact]
    public async Task FehlenderApiKeyRuftDienstNichtAuf()
    {
        var dienst = new SimulierterDienst(HttpStatusCode.OK, """{"text":"egal"}""");
        var service = ErstelleService(dienst, apiKey: "");

        var ausnahme = await Assert.ThrowsAsync<SpracherkennungNichtVerfuegbarAusnahme>(() =>
            service.ErkenneTextAsync(new MemoryStream([1]), "audio/webm", CancellationToken.None));

        Assert.Contains("nicht konfiguriert", ausnahme.Message);
        Assert.Null(dienst.Anfrage);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError, "nicht verfügbar")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "nicht verfügbar")]
    [InlineData(HttpStatusCode.Unauthorized, "API-Key abgelehnt")]
    public async Task FehlerDesDienstesWerdenUebersetzt(HttpStatusCode status, string erwarteteMeldung)
    {
        var service = ErstelleService(new SimulierterDienst(status, """{"error":{"message":"geheim"}}"""), "test-schluessel");

        var ausnahme = await Assert.ThrowsAsync<SpracherkennungNichtVerfuegbarAusnahme>(() =>
            service.ErkenneTextAsync(new MemoryStream([1]), "audio/webm", CancellationToken.None));

        Assert.Contains(erwarteteMeldung, ausnahme.Message);
    }

    [Fact]
    public async Task NichtErreichbarerDienstWirdUebersetzt()
    {
        var service = ErstelleService(new SimulierterDienst(new HttpRequestException("Verbindung abgelehnt")), "test-schluessel");

        await Assert.ThrowsAsync<SpracherkennungNichtVerfuegbarAusnahme>(() =>
            service.ErkenneTextAsync(new MemoryStream([1]), "audio/webm", CancellationToken.None));
    }

    [Fact]
    public async Task AntwortOhneTextLiefertLeerenText()
    {
        var service = ErstelleService(new SimulierterDienst(HttpStatusCode.OK, """{"text":""}"""), "test-schluessel");

        var text = await service.ErkenneTextAsync(new MemoryStream([1]), "audio/webm", CancellationToken.None);

        Assert.Equal(string.Empty, text);
    }

    private static SpracherkennungsService ErstelleService(SimulierterDienst dienst, string apiKey) =>
        new(
            new HttpClient(dienst),
            Options.Create(new SpracherkennungsOptionen { ApiKey = apiKey, Basisadresse = "https://stt.example.test/v1/" }),
            NullLogger<SpracherkennungsService>.Instance);

    private sealed class SimulierterDienst : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _antwort = string.Empty;
        private readonly Exception? _ausnahme;

        public SimulierterDienst(HttpStatusCode status, string antwort)
        {
            _status = status;
            _antwort = antwort;
        }

        public SimulierterDienst(Exception ausnahme) => _ausnahme = ausnahme;

        public HttpRequestMessage? Anfrage { get; private set; }

        public string Inhalt { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Anfrage = request;
            Inhalt = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            if (_ausnahme is not null) throw _ausnahme;
            return new HttpResponseMessage(_status) { Content = new StringContent(_antwort, Encoding.UTF8, "application/json") };
        }
    }
}
