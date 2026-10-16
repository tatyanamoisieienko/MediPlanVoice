using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Beschreibt eine Ressource und einen Zeitraum für die Alternativensuche.</summary>
public sealed record AlternativenAnfrageVertrag
{
    [Required]
    public required DateTimeOffset Beginn { get; init; }

    [Required]
    public required DateTimeOffset Ende { get; init; }

    [Range(1, int.MaxValue)]
    public int? RaumId { get; init; }

    [Range(1, int.MaxValue)]
    public int? MedizingeraetId { get; init; }
}