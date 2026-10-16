using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Core.Entitaeten;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class MedizingeraetService(MediPlanDatenbankkontext datenbank)
{
    public async Task<IReadOnlyList<MedizingeraetZurueckgebenVertrag>> HoleAlleAsync(CancellationToken cancellationToken)
    {
        return await datenbank.Medizingeraete
            .AsNoTracking()
            .OrderBy(geraet => geraet.Name)
            .Select(geraet => new MedizingeraetZurueckgebenVertrag(geraet.Id, geraet.Name, geraet.Geraetetyp, geraet.Standort, geraet.Aktiv))
            .ToListAsync(cancellationToken);
    }

    public async Task<MedizingeraetZurueckgebenVertrag?> HoleAsync(int id, CancellationToken cancellationToken)
    {
        return await datenbank.Medizingeraete
            .AsNoTracking()
            .Where(geraet => geraet.Id == id)
            .Select(geraet => new MedizingeraetZurueckgebenVertrag(geraet.Id, geraet.Name, geraet.Geraetetyp, geraet.Standort, geraet.Aktiv))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<MedizingeraetZurueckgebenVertrag> LegeAnAsync(MedizingeraetAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        var geraet = new Medizingeraet
        {
            Name = vertrag.Name.Trim(),
            Geraetetyp = vertrag.Geraetetyp.Trim(),
            Standort = vertrag.Standort.Trim(),
            Aktiv = vertrag.Aktiv
        };
        datenbank.Medizingeraete.Add(geraet);
        await datenbank.SaveChangesAsync(cancellationToken);

        return new MedizingeraetZurueckgebenVertrag(geraet.Id, geraet.Name, geraet.Geraetetyp, geraet.Standort, geraet.Aktiv);
    }

    public async Task<MedizingeraetZurueckgebenVertrag?> AendereAsync(int id, MedizingeraetAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        var geraet = await datenbank.Medizingeraete.FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (geraet is null)
        {
            return null;
        }

        geraet.Name = vertrag.Name.Trim();
        geraet.Geraetetyp = vertrag.Geraetetyp.Trim();
        geraet.Standort = vertrag.Standort.Trim();
        geraet.Aktiv = vertrag.Aktiv;
        await datenbank.SaveChangesAsync(cancellationToken);

        return new MedizingeraetZurueckgebenVertrag(geraet.Id, geraet.Name, geraet.Geraetetyp, geraet.Standort, geraet.Aktiv);
    }

    public async Task<bool> LoescheAsync(int id, CancellationToken cancellationToken)
    {
        var geraet = await datenbank.Medizingeraete.FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (geraet is null)
        {
            return false;
        }

        datenbank.Medizingeraete.Remove(geraet);
        await datenbank.SaveChangesAsync(cancellationToken);
        return true;
    }
}