namespace MediPlanVoice.Core.Entitaeten;

public sealed class BuchungMedizingeraet
{
    public int BuchungId { get; set; }

    public Buchung Buchung { get; set; } = null!;

    public int MedizingeraetId { get; set; }

    public Medizingeraet Medizingeraet { get; set; } = null!;
}