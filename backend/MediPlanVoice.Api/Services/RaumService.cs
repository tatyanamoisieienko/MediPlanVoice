using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Core.Entitaeten;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class RaumService(MediPlanDatenbankkontext datenbank)
{
    public async Task<IReadOnlyList<RaumZurueckgebenVertrag>> HoleAlleAsync(CancellationToken cancellationToken)
    {
        return await datenbank.Raeume
            .AsNoTracking()
            .OrderBy(raum => raum.Name)
            .Select(raum => new RaumZurueckgebenVertrag(raum.Id, raum.Name, raum.Standort, raum.Kapazitaet, raum.Aktiv))
            .ToListAsync(cancellationToken);
    }

    public async Task<RaumZurueckgebenVertrag?> HoleAsync(int id, CancellationToken cancellationToken)
    {
        return await datenbank.Raeume
            .AsNoTracking()
            .Where(raum => raum.Id == id)
            .Select(raum => new RaumZurueckgebenVertrag(raum.Id, raum.Name, raum.Standort, raum.Kapazitaet, raum.Aktiv))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<RaumZurueckgebenVertrag> LegeAnAsync(RaumAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        var raum = new Raum { Name = vertrag.Name.Trim(), Standort = vertrag.Standort.Trim(), Kapazitaet = vertrag.Kapazitaet, Aktiv = vertrag.Aktiv };
        datenbank.Raeume.Add(raum);
        await datenbank.SaveChangesAsync(cancellationToken);

        return new RaumZurueckgebenVertrag(raum.Id, raum.Name, raum.Standort, raum.Kapazitaet, raum.Aktiv);
    }

    public async Task<RaumZurueckgebenVertrag?> AendereAsync(int id, RaumAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        var raum = await datenbank.Raeume.FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (raum is null)
        {
            return null;
        }

        raum.Name = vertrag.Name.Trim();
        raum.Standort = vertrag.Standort.Trim();
        raum.Kapazitaet = vertrag.Kapazitaet;
        raum.Aktiv = vertrag.Aktiv;
        await datenbank.SaveChangesAsync(cancellationToken);

        return new RaumZurueckgebenVertrag(raum.Id, raum.Name, raum.Standort, raum.Kapazitaet, raum.Aktiv);
    }

    public async Task<bool> LoescheAsync(int id, CancellationToken cancellationToken)
    {
        var raum = await datenbank.Raeume.FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (raum is null)
        {
            return false;
        }

        datenbank.Raeume.Remove(raum);
        await datenbank.SaveChangesAsync(cancellationToken);
        return true;
    }
}