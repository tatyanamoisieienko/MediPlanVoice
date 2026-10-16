namespace MediPlanVoice.Api.Vertraege;

/// <summary>Stellt ein Medizingerät in API-Antworten dar.</summary>
public sealed record MedizingeraetZurueckgebenVertrag(int Id, string Name, string Geraetetyp, string Standort, bool Aktiv);