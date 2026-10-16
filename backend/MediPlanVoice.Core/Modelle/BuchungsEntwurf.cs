namespace MediPlanVoice.Core.Modelle;

public sealed class BuchungsEntwurf
{
    public string? TitelOderZweck { get; init; }

    public DateOnly? Datum { get; init; }

    public TimeOnly? Beginn { get; init; }

    public TimeOnly? Ende { get; init; }

    public int? DauerMinuten { get; init; }

    public BuchungsEntwurfRessource? Raum { get; init; }

    public IReadOnlyList<BuchungsEntwurfRessource> Medizingeraete { get; init; } = [];

    public IReadOnlyList<string> FehlendeAngaben { get; init; } = [];

    public IReadOnlyList<string> UnsichereAngaben { get; init; } = [];
}

public sealed record BuchungsEntwurfRessource(int Id, string Name);