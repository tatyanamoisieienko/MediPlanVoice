using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Core.Entitaeten;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class BuchungsService(
    MediPlanDatenbankkontext datenbank,
    VerfuegbarkeitsService verfuegbarkeitsService)
{
    public async Task<IReadOnlyList<BuchungZurueckgebenVertrag>> HoleAlleAsync(CancellationToken cancellationToken)
    {
        var buchungen = await LadeBuchungen()
            .OrderBy(buchung => buchung.Beginn)
            .ThenBy(buchung => buchung.Id)
            .ToListAsync(cancellationToken);

        return buchungen.Select(Abbilden).ToList();
    }

    public async Task<BuchungZurueckgebenVertrag?> HoleAsync(int id, CancellationToken cancellationToken)
    {
        var buchung = await LadeBuchungen().FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        return buchung is null ? null : Abbilden(buchung);
    }

    public async Task<BuchungZurueckgebenVertrag> LegeAnAsync(BuchungAnlegenVertrag vertrag, CancellationToken cancellationToken)
    {
        PruefeTitel(vertrag.Titel);
        var verfuegbarkeit = await PruefeVerfuegbarkeitAsync(vertrag, null, cancellationToken);
        PruefeErgebnis(verfuegbarkeit);

        var buchung = new Buchung
        {
            Titel = vertrag.Titel.Trim(),
            Beginn = vertrag.Beginn.UtcDateTime,
            Ende = vertrag.Ende.UtcDateTime,
            RaumId = vertrag.RaumId,
            Medizingeraete = (vertrag.MedizingeraetIds ?? []).Select(id => new BuchungMedizingeraet { MedizingeraetId = id }).ToList()
        };

        datenbank.Buchungen.Add(buchung);
        await datenbank.SaveChangesAsync(cancellationToken);

        var gespeicherteBuchung = await LadeBuchungen().FirstAsync(eintrag => eintrag.Id == buchung.Id, cancellationToken);
        return Abbilden(gespeicherteBuchung);
    }

    public async Task<BuchungZurueckgebenVertrag?> AendereAsync(int id, BuchungAendernVertrag vertrag, CancellationToken cancellationToken)
    {
        var buchung = await datenbank.Buchungen
            .Include(eintrag => eintrag.Medizingeraete)
            .FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (buchung is null)
        {
            return null;
        }

        PruefeTitel(vertrag.Titel);
        var verfuegbarkeit = await PruefeVerfuegbarkeitAsync(vertrag, id, cancellationToken);
        PruefeErgebnis(verfuegbarkeit);

        buchung.Titel = vertrag.Titel.Trim();
        buchung.Beginn = vertrag.Beginn.UtcDateTime;
        buchung.Ende = vertrag.Ende.UtcDateTime;
        buchung.RaumId = vertrag.RaumId;
        var angeforderteGeraetIds = (vertrag.MedizingeraetIds ?? []).ToHashSet();
        var entfernteZuordnungen = buchung.Medizingeraete
            .Where(zuordnung => !angeforderteGeraetIds.Contains(zuordnung.MedizingeraetId))
            .ToList();
        datenbank.BuchungMedizingeraete.RemoveRange(entfernteZuordnungen);
        foreach (var zuordnung in entfernteZuordnungen)
        {
            buchung.Medizingeraete.Remove(zuordnung);
        }

        var vorhandeneGeraetIds = buchung.Medizingeraete.Select(zuordnung => zuordnung.MedizingeraetId).ToHashSet();
        foreach (var medizingeraetId in angeforderteGeraetIds.Except(vorhandeneGeraetIds))
        {
            buchung.Medizingeraete.Add(new BuchungMedizingeraet { BuchungId = id, MedizingeraetId = medizingeraetId });
        }

        await datenbank.SaveChangesAsync(cancellationToken);

        var gespeicherteBuchung = await LadeBuchungen().FirstAsync(eintrag => eintrag.Id == id, cancellationToken);
        return Abbilden(gespeicherteBuchung);
    }

    public async Task<bool> LoescheAsync(int id, CancellationToken cancellationToken)
    {
        var buchung = await datenbank.Buchungen.FirstOrDefaultAsync(eintrag => eintrag.Id == id, cancellationToken);
        if (buchung is null)
        {
            return false;
        }

        datenbank.Buchungen.Remove(buchung);
        await datenbank.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<VerfuegbarkeitsErgebnisVertrag> PruefeVerfuegbarkeitAsync(
        BuchungAnlegenVertrag vertrag,
        int? auszuschliessendeBuchungId,
        CancellationToken cancellationToken)
    {
        return await verfuegbarkeitsService.PruefeAsync(
            new VerfuegbarkeitPruefenVertrag
            {
                Beginn = vertrag.Beginn,
                Ende = vertrag.Ende,
                RaumId = vertrag.RaumId,
                MedizingeraetIds = vertrag.MedizingeraetIds ?? []
            },
            auszuschliessendeBuchungId,
            cancellationToken);
    }

    private async Task<VerfuegbarkeitsErgebnisVertrag> PruefeVerfuegbarkeitAsync(
        BuchungAendernVertrag vertrag,
        int? auszuschliessendeBuchungId,
        CancellationToken cancellationToken)
    {
        return await verfuegbarkeitsService.PruefeAsync(
            new VerfuegbarkeitPruefenVertrag
            {
                Beginn = vertrag.Beginn,
                Ende = vertrag.Ende,
                RaumId = vertrag.RaumId,
                MedizingeraetIds = vertrag.MedizingeraetIds ?? []
            },
            auszuschliessendeBuchungId,
            cancellationToken);
    }

    private static void PruefeTitel(string titel)
    {
        if (string.IsNullOrWhiteSpace(titel))
        {
            throw new BuchungsValidierungsAusnahme(["Der Titel darf nicht leer sein."]);
        }
    }

    private static void PruefeErgebnis(VerfuegbarkeitsErgebnisVertrag ergebnis)
    {
        if (!ergebnis.AnfrageGueltig)
        {
            throw new BuchungsValidierungsAusnahme(ergebnis.Fehler);
        }

        if (!ergebnis.Verfuegbar)
        {
            throw new BuchungskonfliktAusnahme(ergebnis);
        }
    }

    private IQueryable<Buchung> LadeBuchungen()
    {
        return datenbank.Buchungen
            .AsNoTracking()
            .Include(buchung => buchung.Raum)
            .Include(buchung => buchung.Medizingeraete)
                .ThenInclude(zuordnung => zuordnung.Medizingeraet);
    }

    private static BuchungZurueckgebenVertrag Abbilden(Buchung buchung)
    {
        return new BuchungZurueckgebenVertrag(
            buchung.Id,
            buchung.Titel,
            AlsUtc(buchung.Beginn),
            AlsUtc(buchung.Ende),
            buchung.RaumId,
            buchung.Raum.Name,
            buchung.Medizingeraete.Select(zuordnung => zuordnung.MedizingeraetId).Order().ToList());
    }

    private static DateTimeOffset AlsUtc(DateTime zeitpunkt)
    {
        return new DateTimeOffset(DateTime.SpecifyKind(zeitpunkt, DateTimeKind.Utc));
    }
}

public sealed class BuchungsValidierungsAusnahme(IReadOnlyList<string> fehler) : Exception(string.Join(" ", fehler))
{
    public IReadOnlyList<string> Fehler { get; } = fehler;
}

public sealed class BuchungskonfliktAusnahme(VerfuegbarkeitsErgebnisVertrag ergebnis)
    : Exception("Die angefragten Ressourcen sind im gewünschten Zeitraum nicht verfügbar.")
{
    public VerfuegbarkeitsErgebnisVertrag Ergebnis { get; } = ergebnis;
}