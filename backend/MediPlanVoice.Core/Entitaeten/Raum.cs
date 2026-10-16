namespace MediPlanVoice.Core.Entitaeten;

public sealed class Raum
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Standort { get; set; } = string.Empty;

    public int Kapazitaet { get; set; }

    public bool Aktiv { get; set; } = true;
}