namespace MediPlanVoice.Api.Vertraege;

/// <summary>Beschreibt eine Ressource, die durch eine bestehende Buchung belegt ist.</summary>
public sealed record BuchungskonfliktVertrag(
    string RessourceTyp,
    int RessourceId,
    string RessourcenName,
    int BuchungId,
    string Buchungstitel,
    DateTimeOffset Beginn,
    DateTimeOffset Ende);