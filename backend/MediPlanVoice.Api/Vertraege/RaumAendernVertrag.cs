using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält die Angaben zum Ändern eines Raums.</summary>
public sealed record RaumAendernVertrag
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Standort { get; init; }

    [Range(0, int.MaxValue)]
    public int Kapazitaet { get; init; }

    public bool Aktiv { get; init; } = true;
}