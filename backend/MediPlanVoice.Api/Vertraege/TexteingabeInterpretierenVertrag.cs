using System.ComponentModel.DataAnnotations;

namespace MediPlanVoice.Api.Vertraege;

/// <summary>Enthält einen Text, der in einen nicht gespeicherten Buchungsentwurf interpretiert wird.</summary>
public sealed record TexteingabeInterpretierenVertrag
{
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string Text { get; init; }
}