using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält die Angaben zum Anlegen eines Medizingeräts.</summary>
public sealed record MedizingeraetAnlegenVertrag
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Geraetetyp { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Standort { get; init; }

    public bool Aktiv { get; init; } = true;
}