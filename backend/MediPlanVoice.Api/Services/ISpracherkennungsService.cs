namespace MediPlanVoice.Api.Services;

/// <summary>Wandelt gesprochene Sprache in Text um. Kennt keine Buchungslogik.</summary>
public interface ISpracherkennungsService
{
    /// <summary>Erkennt deutschen Text in den Audiodaten. Liefert einen leeren Text, wenn nichts erkannt wurde.</summary>
    /// <exception cref="SpracherkennungNichtVerfuegbarAusnahme">Der Dienst ist nicht konfiguriert oder nicht erreichbar.</exception>
    Task<string> ErkenneTextAsync(Stream audio, string inhaltstyp, CancellationToken cancellationToken);
}

public sealed class SpracherkennungNichtVerfuegbarAusnahme(string meldung, Exception? ursache = null)
    : Exception(meldung, ursache);
