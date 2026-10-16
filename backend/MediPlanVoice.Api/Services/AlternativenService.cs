using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class AlternativenService(
    MediPlanDatenbankkontext datenbank,
    VerfuegbarkeitsService verfuegbarkeitsService)
{
    public async Task<AlternativenErgebnisVertrag> SucheAsync(
        AlternativenAnfrageVertrag anfrage,
        CancellationToken cancellationToken)
    {
        var fehler = new List<string>();
        if (anfrage.Beginn >= anfrage.Ende)
        {
            fehler.Add("Der Startzeitpunkt muss vor dem Endzeitpunkt liegen.");
        }

        if (anfrage.RaumId.HasValue == anfrage.MedizingeraetId.HasValue)
        {
            fehler.Add("Es muss genau ein Raum oder ein Medizingeraet für die Suche angegeben werden.");
        }

        if (fehler.Count > 0)
        {
            return UngueltigeAnfrage(fehler);
        }

        var vorschlaege = anfrage.RaumId.HasValue
            ? await SucheRaumAlternativenAsync(anfrage, cancellationToken)
            : await SucheGeraeteAlternativenAsync(anfrage, cancellationToken);

        return new AlternativenErgebnisVertrag(
            true,
            vorschlaege.Count > 0,
            vorschlaege,
            [],
            vorschlaege.Count > 0 ? null : "Es wurde keine passende verfügbare Alternative gefunden.");
    }

    private async Task<IReadOnlyList<AlternativVorschlag>> SucheRaumAlternativenAsync(
        AlternativenAnfrageVertrag anfrage,
        CancellationToken cancellationToken)
    {
        var angefragterRaum = await datenbank.Raeume
            .AsNoTracking()
            .FirstOrDefaultAsync(raum => raum.Id == anfrage.RaumId!.Value, cancellationToken);
        if (angefragterRaum is null)
        {
            return [];
        }

        var kandidaten = await datenbank.Raeume
            .AsNoTracking()
            .Where(raum => raum.Aktiv && raum.Id != angefragterRaum.Id)
            .OrderByDescending(raum => raum.Standort == angefragterRaum.Standort)
            .ThenBy(raum => raum.Name)
            .ThenBy(raum => raum.Id)
            .ToListAsync(cancellationToken);

        var vorschlaege = new List<AlternativVorschlag>();
        foreach (var raum in kandidaten)
        {
            var verfuegbarkeit = await verfuegbarkeitsService.PruefeAsync(
                new VerfuegbarkeitPruefenVertrag
                {
                    Beginn = anfrage.Beginn,
                    Ende = anfrage.Ende,
                    RaumId = raum.Id
                },
                null,
                cancellationToken);

            if (verfuegbarkeit.AnfrageGueltig && verfuegbarkeit.Verfuegbar)
            {
                vorschlaege.Add(new AlternativVorschlag(
                    "Raum",
                    raum.Id,
                    raum.Name,
                    raum.Standort,
                    null,
                    Gruende(raum.Standort == angefragterRaum.Standort, false)));
            }
        }

        return vorschlaege;
    }

    private async Task<IReadOnlyList<AlternativVorschlag>> SucheGeraeteAlternativenAsync(
        AlternativenAnfrageVertrag anfrage,
        CancellationToken cancellationToken)
    {
        var angefragtesGeraet = await datenbank.Medizingeraete
            .AsNoTracking()
            .FirstOrDefaultAsync(geraet => geraet.Id == anfrage.MedizingeraetId!.Value, cancellationToken);
        if (angefragtesGeraet is null)
        {
            return [];
        }

        var kandidaten = await datenbank.Medizingeraete
            .AsNoTracking()
            .Where(geraet =>
                geraet.Aktiv &&
                geraet.Id != angefragtesGeraet.Id &&
                geraet.Geraetetyp == angefragtesGeraet.Geraetetyp)
            .OrderByDescending(geraet => geraet.Standort == angefragtesGeraet.Standort)
            .ThenBy(geraet => geraet.Name)
            .ThenBy(geraet => geraet.Id)
            .ToListAsync(cancellationToken);

        var vorschlaege = new List<AlternativVorschlag>();
        foreach (var geraet in kandidaten)
        {
            var verfuegbarkeit = await verfuegbarkeitsService.PruefeAsync(
                new VerfuegbarkeitPruefenVertrag
                {
                    Beginn = anfrage.Beginn,
                    Ende = anfrage.Ende,
                    RaumId = null,
                    MedizingeraetIds = [geraet.Id]
                },
                null,
                cancellationToken);

            if (verfuegbarkeit.AnfrageGueltig && verfuegbarkeit.Verfuegbar)
            {
                vorschlaege.Add(new AlternativVorschlag(
                    "Medizingeraet",
                    geraet.Id,
                    geraet.Name,
                    geraet.Standort,
                    geraet.Geraetetyp,
                    Gruende(geraet.Standort == angefragtesGeraet.Standort, true)));
            }
        }

        return vorschlaege;
    }

    private static IReadOnlyList<string> Gruende(bool gleicherStandort, bool gleicherGeraetetyp)
    {
        var gruende = new List<string> { "Im angefragten Zeitraum verfügbar." };
        if (gleicherStandort)
        {
            gruende.Add("Gleicher Standort.");
        }

        if (gleicherGeraetetyp)
        {
            gruende.Add("Gleicher Gerätetyp.");
        }

        return gruende;
    }

    private static AlternativenErgebnisVertrag UngueltigeAnfrage(IReadOnlyList<string> fehler)
    {
        return new AlternativenErgebnisVertrag(false, false, [], fehler, null);
    }
}