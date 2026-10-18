using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using Microsoft.AspNetCore.Mvc;

namespace MediPlanVoice.Api.Controllers;

[ApiController]
[Route("api/sprache")]
public sealed class SpracheController(ISpracherkennungsService spracherkennungsService) : ControllerBase
{
    private const long MaximaleAudiogroesse = 10 * 1024 * 1024;
    private const long MaximaleAnfragegroesse = MaximaleAudiogroesse + 64 * 1024;

    /// <summary>Wandelt eine Sprachaufnahme in Text um. Interpretiert, prüft oder speichert keine Buchung.</summary>
    [HttpPost("transkribieren")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximaleAnfragegroesse)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaximaleAnfragegroesse)]
    public async Task<ActionResult<TranskriptionZurueckgebenVertrag>> Transkribiere(
        IFormFile? audio,
        CancellationToken cancellationToken)
    {
        if (audio is null)
        {
            return Fehler(StatusCodes.Status400BadRequest, "Es wurde keine Audiodatei übermittelt.");
        }

        if (audio.Length == 0)
        {
            return Fehler(StatusCodes.Status400BadRequest, "Die Audiodatei ist leer.");
        }

        if (audio.Length > MaximaleAudiogroesse)
        {
            return Fehler(StatusCodes.Status413PayloadTooLarge, "Die Aufnahme ist zu lang.");
        }

        if (!Audioformate.IstUnterstuetzt(audio.ContentType))
        {
            return Fehler(StatusCodes.Status415UnsupportedMediaType, "Das Audioformat wird nicht unterstützt.");
        }

        string text;
        try
        {
            await using var datenstrom = audio.OpenReadStream();
            text = await spracherkennungsService.ErkenneTextAsync(datenstrom, audio.ContentType, cancellationToken);
        }
        catch (SpracherkennungNichtVerfuegbarAusnahme ausnahme)
        {
            return Fehler(StatusCodes.Status503ServiceUnavailable, ausnahme.Message);
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return Fehler(StatusCodes.Status422UnprocessableEntity, "In der Aufnahme wurde kein Text erkannt.");
        }

        return Ok(new TranskriptionZurueckgebenVertrag(text.Trim()));
    }

    private ObjectResult Fehler(int status, string meldung) =>
        Problem(statusCode: status, title: "Spracherkennung fehlgeschlagen", detail: meldung);
}
