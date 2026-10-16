using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält die Angaben zum Ändern eines Medizingeräts.</summary>
public sealed record MedizingeraetAendernVertrag
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Geraetetyp { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Standort { get; init; }

    public bool Aktiv { get; init; } = true;
}