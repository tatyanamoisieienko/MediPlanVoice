using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Beschreibt die gewünschte Ressourcenkombination für eine Verfügbarkeitsprüfung.</summary>
public sealed record VerfuegbarkeitPruefenVertrag
{
    public required DateTimeOffset Beginn { get; init; }

    public required DateTimeOffset Ende { get; init; }

    [Required, Range(1, int.MaxValue)]
    public required int? RaumId { get; init; }

    [Range(1, int.MaxValue)]
    public int? AuszuschliessendeBuchungId { get; init; }

    public List<int> MedizingeraetIds { get; init; } = [];
}