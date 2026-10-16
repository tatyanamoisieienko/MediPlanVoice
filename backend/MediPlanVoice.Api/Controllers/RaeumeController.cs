using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using Microsoft.AspNetCore.Mvc;

namespace MediPlanVoice.Api.Controllers;

[ApiController]
[Route("api/raeume")]
public sealed class RaeumeController(RaumService raumService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RaumZurueckgebenVertrag>>> HoleAlle(CancellationToken cancellationToken)
    {
        return Ok(await raumService.HoleAlleAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RaumZurueckgebenVertrag>> HoleEinzelnen(int id, CancellationToken cancellationToken)
    {
        var raum = await raumService.HoleAsync(id, cancellationToken);
        return raum is null ? NotFound() : Ok(raum);
    }

    [HttpPost]
    public async Task<ActionResult<RaumZurueckgebenVertrag>> LegeAn(RaumAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        var raum = await raumService.LegeAnAsync(vertrag, cancellationToken);
        return CreatedAtAction(nameof(HoleEinzelnen), new { id = raum.Id }, raum);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RaumZurueckgebenVertrag>> Aendere(int id, RaumAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        var raum = await raumService.AendereAsync(id, vertrag, cancellationToken);
        return raum is null ? NotFound() : Ok(raum);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Loesche(int id, CancellationToken cancellationToken)
    {
        return await raumService.LoescheAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}