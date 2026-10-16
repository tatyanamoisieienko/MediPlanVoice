using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält die Angaben zum Ändern einer Buchung.</summary>
public sealed record BuchungAendernVertrag
{
    [Required, StringLength(200, MinimumLength = 1)]
    public required string Titel { get; init; }

    public required DateTimeOffset Beginn { get; init; }

    public required DateTimeOffset Ende { get; init; }

    [Range(1, int.MaxValue)]
    public required int RaumId { get; init; }

    public List<int> MedizingeraetIds { get; init; } = [];
}