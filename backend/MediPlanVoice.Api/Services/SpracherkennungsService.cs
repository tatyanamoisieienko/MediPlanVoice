using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace MediPlanVoice.Api.Services;

/// <summary>Spracherkennung über die OpenAI-Transkriptions-API. Audio wird nur durchgereicht und nicht gespeichert.</summary>
public sealed class SpracherkennungsService(
    HttpClient httpClient,
    IOptions<SpracherkennungsOptionen> optionen,
    ILogger<SpracherkennungsService> logger) : ISpracherkennungsService
{
    public async Task<string> ErkenneTextAsync(Stream audio, string inhaltstyp, CancellationToken cancellationToken)
    {
        var einstellungen = optionen.Value;
        if (string.IsNullOrWhiteSpace(einstellungen.ApiKey))
        {
            throw new SpracherkennungNichtVerfuegbarAusnahme("Die Spracherkennung ist nicht konfiguriert (API-Key fehlt).");
        }

        var dateiinhalt = new StreamContent(audio);
        dateiinhalt.Headers.ContentType = new MediaTypeHeaderValue(Audioformate.Normalisiere(inhaltstyp));
        using var formular = new MultipartFormDataContent
        {
            { dateiinhalt, "file", $"aufnahme.{Audioformate.Dateiendung(inhaltstyp)}" },
            { new StringContent(einstellungen.Modell), "model" },
            { new StringContent(einstellungen.Sprache), "language" },
            { new StringContent("json"), "response_format" },
        };
        using var anfrage = new HttpRequestMessage(HttpMethod.Post, new Uri(new Uri(einstellungen.Basisadresse), "audio/transcriptions"))
        {
            Content = formular,
        };
        anfrage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", einstellungen.ApiKey);

        using var zeitlimit = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        zeitlimit.CancelAfter(TimeSpan.FromSeconds(einstellungen.ZeitlimitSekunden));

        try
        {
            using var antwort = await httpClient.SendAsync(anfrage, zeitlimit.Token);
            if (!antwort.IsSuccessStatusCode)
            {
                logger.LogWarning("Spracherkennung antwortete mit HTTP {Status}.", (int)antwort.StatusCode);
                throw new SpracherkennungNichtVerfuegbarAusnahme(antwort.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
                    ? "Die Spracherkennung hat den API-Key abgelehnt."
                    : "Der Spracherkennungsdienst ist zurzeit nicht verfügbar.");
            }

            await using var inhalt = await antwort.Content.ReadAsStreamAsync(zeitlimit.Token);
            using var json = await JsonDocument.ParseAsync(inhalt, cancellationToken: zeitlimit.Token);
            return json.RootElement.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String
                ? text.GetString()!.Trim()
                : string.Empty;
        }
        catch (OperationCanceledException ausnahme) when (!cancellationToken.IsCancellationRequested)
        {
            throw new SpracherkennungNichtVerfuegbarAusnahme("Der Spracherkennungsdienst hat nicht rechtzeitig geantwortet.", ausnahme);
        }
        catch (Exception ausnahme) when (ausnahme is HttpRequestException or JsonException)
        {
            logger.LogWarning(ausnahme, "Spracherkennung fehlgeschlagen.");
            throw new SpracherkennungNichtVerfuegbarAusnahme("Der Spracherkennungsdienst ist zurzeit nicht verfügbar.", ausnahme);
        }
    }
}
