namespace MediPlanVoice.Core.Entitaeten;

public sealed class Medizingeraet
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Geraetetyp { get; set; } = string.Empty;

    public string Standort { get; set; } = string.Empty;

    public bool Aktiv { get; set; } = true;
}