using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using Microsoft.AspNetCore.Mvc;

namespace MediPlanVoice.Api.Controllers;

[ApiController]
[Route("api/buchungsentwuerfe")]
public sealed class BuchungsInterpretationController(IBuchungsInterpretationsService interpretationsService) : ControllerBase
{
    [HttpPost("interpretieren")]
    public async Task<ActionResult<BuchungsEntwurfZurueckgebenVertrag>> Interpretiere(
        TexteingabeInterpretierenVertrag vertrag,
        CancellationToken cancellationToken)
    {
        var entwurf = await interpretationsService.InterpretiereAsync(vertrag.Text, cancellationToken);
        return Ok(new BuchungsEntwurfZurueckgebenVertrag(
            entwurf.TitelOderZweck,
            entwurf.Datum,
            entwurf.Beginn,
            entwurf.Ende,
            entwurf.DauerMinuten,
            entwurf.Raum is null
                ? null
                : new BuchungsEntwurfRessourceVertrag(entwurf.Raum.Id, entwurf.Raum.Name),
            entwurf.Medizingeraete
                .Select(geraet => new BuchungsEntwurfRessourceVertrag(geraet.Id, geraet.Name))
                .ToList(),
            entwurf.FehlendeAngaben,
            entwurf.UnsichereAngaben));
    }
}