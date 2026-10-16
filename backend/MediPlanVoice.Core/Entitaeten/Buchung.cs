namespace MediPlanVoice.Core.Entitaeten;

public sealed class Buchung
{
    public int Id { get; set; }

    public string Titel { get; set; } = string.Empty;

    public DateTime Beginn { get; set; }

    public DateTime Ende { get; set; }

    public int RaumId { get; set; }

    public Raum Raum { get; set; } = null!;

    public ICollection<BuchungMedizingeraet> Medizingeraete { get; set; } = new List<BuchungMedizingeraet>();
}