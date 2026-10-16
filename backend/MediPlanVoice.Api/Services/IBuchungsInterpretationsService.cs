using MediPlanVoice.Core.Modelle;

namespace MediPlanVoice.Api.Services;

public interface IBuchungsInterpretationsService
{
    Task<BuchungsEntwurf> InterpretiereAsync(string text, CancellationToken cancellationToken);
}