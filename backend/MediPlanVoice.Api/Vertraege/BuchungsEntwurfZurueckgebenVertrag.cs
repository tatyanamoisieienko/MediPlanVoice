namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält interpretierte Angaben, offene Felder und Unsicherheiten ohne Buchung zu speichern.</summary>
public sealed record BuchungsEntwurfZurueckgebenVertrag(
    string? TitelOderZweck,
    DateOnly? Datum,
    TimeOnly? Beginn,
    TimeOnly? Ende,
    int? DauerMinuten,
    BuchungsEntwurfRessourceVertrag? Raum,
    IReadOnlyList<BuchungsEntwurfRessourceVertrag> Medizingeraete,
    IReadOnlyList<string> FehlendeAngaben,
    IReadOnlyList<string> UnsichereAngaben);