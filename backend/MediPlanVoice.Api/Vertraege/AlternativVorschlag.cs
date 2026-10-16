namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält eine geeignete Alternative und die Gründe für ihren Vorschlag.</summary>
public sealed record AlternativVorschlag(
    string RessourceTyp,
    int Id,
    string Name,
    string Standort,
    string? Geraetetyp,
    IReadOnlyList<string> Gruende);