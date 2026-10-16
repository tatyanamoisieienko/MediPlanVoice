namespace MediPlanVoice.Api.Vertraege;

/// <summary>Stellt eine Buchung in API-Antworten dar.</summary>
public sealed record BuchungZurueckgebenVertrag(
    int Id,
    string Titel,
    DateTimeOffset Beginn,
    DateTimeOffset Ende,
    int RaumId,
    string RaumName,
    IReadOnlyList<int> MedizingeraetIds);