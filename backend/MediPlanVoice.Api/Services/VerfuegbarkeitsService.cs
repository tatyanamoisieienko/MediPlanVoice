using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class VerfuegbarkeitsService(MediPlanDatenbankkontext datenbank)
{
    public async Task<VerfuegbarkeitsErgebnisVertrag> PruefeAsync(
        VerfuegbarkeitPruefenVertrag anfrage,
        int? auszuschliessendeBuchungId,
        CancellationToken cancellationToken)
    {
        var fehler = new List<string>();
        var beginn = anfrage.Beginn.UtcDateTime;
        var ende = anfrage.Ende.UtcDateTime;

        if (beginn >= ende)
        {
            fehler.Add("Der Startzeitpunkt muss vor dem Endzeitpunkt liegen.");
        }

        var medizingeraetIds = anfrage.MedizingeraetIds?.ToArray() ?? [];
        if (medizingeraetIds.Distinct().Count() != medizingeraetIds.Length)
        {
            fehler.Add("Ein Medizingeraet darf nur einmal angegeben werden.");
        }

        if (!anfrage.RaumId.HasValue && medizingeraetIds.Length == 0)
        {
            fehler.Add("Mindestens ein Raum oder ein Medizingeraet muss angegeben werden.");
        }

        if (anfrage.RaumId.HasValue)
        {
            var raumAktiv = await datenbank.Raeume
                .AnyAsync(raum => raum.Id == anfrage.RaumId.Value && raum.Aktiv, cancellationToken);
            if (!raumAktiv)
            {
                fehler.Add($"Raum {anfrage.RaumId} existiert nicht oder ist nicht aktiv.");
            }
        }

        if (medizingeraetIds.Length > 0)
        {
            var aktiveGeraeteIds = await datenbank.Medizingeraete
                .Where(geraet => medizingeraetIds.Contains(geraet.Id) && geraet.Aktiv)
                .Select(geraet => geraet.Id)
                .ToListAsync(cancellationToken);

            foreach (var id in medizingeraetIds.Except(aktiveGeraeteIds).Distinct())
            {
                fehler.Add($"Medizingeraet {id} existiert nicht oder ist nicht aktiv.");
            }
        }

        if (fehler.Count > 0)
        {
            return new VerfuegbarkeitsErgebnisVertrag(false, false, fehler, []);
        }

        var ueberlappendeBuchungen = await datenbank.Buchungen
            .AsNoTracking()
            .Where(buchung =>
                (!auszuschliessendeBuchungId.HasValue || buchung.Id != auszuschliessendeBuchungId.Value) &&
                buchung.Beginn < ende && beginn < buchung.Ende &&
                ((anfrage.RaumId.HasValue && buchung.RaumId == anfrage.RaumId.Value) ||
                 (medizingeraetIds.Length > 0 && buchung.Medizingeraete.Any(zuordnung => medizingeraetIds.Contains(zuordnung.MedizingeraetId)))))
            .Include(buchung => buchung.Raum)
            .Include(buchung => buchung.Medizingeraete)
                .ThenInclude(zuordnung => zuordnung.Medizingeraet)
            .ToListAsync(cancellationToken);

        var konflikte = new List<BuchungskonfliktVertrag>();
        foreach (var buchung in ueberlappendeBuchungen)
        {
            if (anfrage.RaumId.HasValue && buchung.RaumId == anfrage.RaumId.Value)
            {
                konflikte.Add(new BuchungskonfliktVertrag(
                    "Raum",
                    buchung.RaumId,
                    buchung.Raum.Name,
                    buchung.Id,
                    buchung.Titel,
                    AlsUtc(buchung.Beginn),
                    AlsUtc(buchung.Ende)));
            }

            foreach (var zuordnung in buchung.Medizingeraete.Where(zuordnung => medizingeraetIds.Contains(zuordnung.MedizingeraetId)))
            {
                konflikte.Add(new BuchungskonfliktVertrag(
                    "Medizingeraet",
                    zuordnung.MedizingeraetId,
                    zuordnung.Medizingeraet.Name,
                    buchung.Id,
                    buchung.Titel,
                    AlsUtc(buchung.Beginn),
                    AlsUtc(buchung.Ende)));
            }
        }

        return new VerfuegbarkeitsErgebnisVertrag(true, konflikte.Count == 0, [], konflikte);
    }

    private static DateTimeOffset AlsUtc(DateTime zeitpunkt)
    {
        return new DateTimeOffset(DateTime.SpecifyKind(zeitpunkt, DateTimeKind.Utc));
    }
}