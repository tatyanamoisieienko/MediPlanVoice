namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält Validierungsfehler und Ressourcenkonflikte einer Prüfung.</summary>
public sealed record VerfuegbarkeitsErgebnisVertrag(
    bool AnfrageGueltig,
    bool Verfuegbar,
    IReadOnlyList<string> Fehler,
    IReadOnlyList<BuchungskonfliktVertrag> Konflikte);