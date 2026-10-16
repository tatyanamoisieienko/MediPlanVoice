namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält den Status und alle gefundenen Alternativen einer Anfrage.</summary>
public sealed record AlternativenErgebnisVertrag(
    bool AnfrageGueltig,
    bool AlternativenGefunden,
    IReadOnlyList<AlternativVorschlag> Vorschlaege,
    IReadOnlyList<string> Fehler,
    string? Hinweis);