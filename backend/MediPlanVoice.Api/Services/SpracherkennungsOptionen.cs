namespace MediPlanVoice.Api.Services;

/// <summary>Konfiguration der Spracherkennung (Abschnitt „Spracherkennung“). Der API-Key gehört nicht in den Source Code.</summary>
public sealed class SpracherkennungsOptionen
{
    public const string Abschnitt = "Spracherkennung";

    public string? ApiKey { get; init; }

    public string Basisadresse { get; init; } = "https://api.openai.com/v1/";

    public string Modell { get; init; } = "gpt-4o-mini-transcribe";

    public string Sprache { get; init; } = "de";

    public int ZeitlimitSekunden { get; init; } = 30;
}
