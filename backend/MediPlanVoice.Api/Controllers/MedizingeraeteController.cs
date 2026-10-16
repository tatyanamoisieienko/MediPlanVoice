using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using Microsoft.AspNetCore.Mvc;

namespace MediPlanVoice.Api.Controllers;

[ApiController]
[Route("api/medizingeraete")]
public sealed class MedizingeraeteController(MedizingeraetService medizingeraetService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MedizingeraetZurueckgebenVertrag>>> HoleAlle(CancellationToken cancellationToken)
    {
        return Ok(await medizingeraetService.HoleAlleAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MedizingeraetZurueckgebenVertrag>> HoleEinzelnen(int id, CancellationToken cancellationToken)
    {
        var geraet = await medizingeraetService.HoleAsync(id, cancellationToken);
        return geraet is null ? NotFound() : Ok(geraet);
    }

    [HttpPost]
    public async Task<ActionResult<MedizingeraetZurueckgebenVertrag>> LegeAn(MedizingeraetAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        var geraet = await medizingeraetService.LegeAnAsync(vertrag, cancellationToken);
        return CreatedAtAction(nameof(HoleEinzelnen), new { id = geraet.Id }, geraet);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MedizingeraetZurueckgebenVertrag>> Aendere(int id, MedizingeraetAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        var geraet = await medizingeraetService.AendereAsync(id, vertrag, cancellationToken);
        return geraet is null ? NotFound() : Ok(geraet);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Loesche(int id, CancellationToken cancellationToken)
    {
        return await medizingeraetService.LoescheAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}