using MediPlanVoice.Api.Services;
using MediPlanVoice.Api.Vertraege;
using Microsoft.AspNetCore.Mvc;

namespace MediPlanVoice.Api.Controllers;

[ApiController]
[Route("api/buchungen")]
public sealed class BuchungenController(
    BuchungsService buchungsService,
    VerfuegbarkeitsService verfuegbarkeitsService,
    AlternativenService alternativenService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BuchungZurueckgebenVertrag>>> HoleAlle(CancellationToken cancellationToken)
    {
        return Ok(await buchungsService.HoleAlleAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BuchungZurueckgebenVertrag>> HoleEinzelnen(int id, CancellationToken cancellationToken)
    {
        var buchung = await buchungsService.HoleAsync(id, cancellationToken);
        return buchung is null ? NotFound() : Ok(buchung);
    }

    [HttpPost]
    public async Task<ActionResult<BuchungZurueckgebenVertrag>> LegeAn(BuchungAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        try
        {
            var buchung = await buchungsService.LegeAnAsync(vertrag, cancellationToken);
            return CreatedAtAction(nameof(HoleEinzelnen), new { id = buchung.Id }, buchung);
        }
        catch (BuchungsValidierungsAusnahme ausnahme)
        {
            return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["Buchung"] = ausnahme.Fehler.ToArray() }));
        }
        catch (BuchungskonfliktAusnahme ausnahme)
        {
            return Conflict(ausnahme.Ergebnis);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BuchungZurueckgebenVertrag>> Aendere(int id, BuchungAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        try
        {
            var buchung = await buchungsService.AendereAsync(id, vertrag, cancellationToken);
            return buchung is null ? NotFound() : Ok(buchung);
        }
        catch (BuchungsValidierungsAusnahme ausnahme)
        {
            return BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { ["Buchung"] = ausnahme.Fehler.ToArray() }));
        }
        catch (BuchungskonfliktAusnahme ausnahme)
        {
            return Conflict(ausnahme.Ergebnis);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Loesche(int id, CancellationToken cancellationToken)
    {
        return await buchungsService.LoescheAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPost("verfuegbarkeit")]
    public async Task<ActionResult<VerfuegbarkeitsErgebnisVertrag>> PruefeVerfuegbarkeit(
        VerfuegbarkeitPruefenVertrag vertrag,
        CancellationToken cancellationToken)
    {
        var ergebnis = await verfuegbarkeitsService.PruefeAsync(vertrag, vertrag.AuszuschliessendeBuchungId, cancellationToken);
        return ergebnis.AnfrageGueltig ? Ok(ergebnis) : BadRequest(ergebnis);
    }

    [HttpPost("alternativen")]
    public async Task<ActionResult<AlternativenErgebnisVertrag>> SucheAlternativen(
        AlternativenAnfrageVertrag vertrag,
        CancellationToken cancellationToken)
    {
        var ergebnis = await alternativenService.SucheAsync(vertrag, cancellationToken);
        return ergebnis.AnfrageGueltig ? Ok(ergebnis) : BadRequest(ergebnis);
    }
}