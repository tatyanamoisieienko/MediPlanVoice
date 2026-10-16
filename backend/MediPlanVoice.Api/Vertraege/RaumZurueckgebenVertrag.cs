namespace MediPlanVoice.Api.Vertraege;

/// <summary>Stellt einen Raum in API-Antworten dar.</summary>
public sealed record RaumZurueckgebenVertrag(int Id, string Name, string Standort, int Kapazitaet, bool Aktiv);