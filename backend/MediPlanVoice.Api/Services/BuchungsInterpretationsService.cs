using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using MediPlanVoice.Core.Modelle;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Api.Services;

public sealed class BuchungsInterpretationsService(
    MediPlanDatenbankkontext datenbank,
    TimeProvider zeitProvider) : IBuchungsInterpretationsService
{
    private static readonly Regex ZeitspanneMuster = new(
        @"(?:\bvon\s*)?(?<beginn>\d{1,2}(?::\d{2})?)\s*(?:uhr)?\s*(?:bis|[-–])\s*(?<ende>\d{1,2}(?::\d{2})?)\s*(?:uhr)?\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex BeginnMuster = new(
        @"\b(?:um|von)\s+(?<beginn>\d{1,2}(?::\d{2})?)\s*uhr\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex DauerMuster = new(
        @"\b(?:für|fuer)\s+(?<dauer>\d{1,3})\s*(?<einheit>min(?:uten)?|stunden?)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex ZweckMuster = new(
        @"\b(?:für|fuer|wegen|zur|zum)\s+(?<zweck>[^,.;]+)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex DeutschesDatumMuster = new(
        @"\b(?<tag>\d{1,2})\.(?<monat>\d{1,2})\.(?<jahr>\d{4})\b",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex IsoDatumMuster = new(
        @"\b(?<jahr>\d{4})-(?<monat>\d{2})-(?<tag>\d{2})\b",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex RaumErwaehnungMuster = new(
        @"\b(?:raum|zimmer)\s+(?<name>[\p{L}\p{N}][\p{L}\p{N} -]*)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex GeraeteErwaehnungMuster = new(
        @"\bmit\s+(?<name>.+?)(?=\s+\b(?:für|fuer|wegen|zur|zum)\b|[,.;]|$)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public async Task<BuchungsEntwurf> InterpretiereAsync(string text, CancellationToken cancellationToken)
    {
        var fehlendeAngaben = new List<string>();
        var unsichereAngaben = new List<string>();
        var titelOderZweck = ErmittleZweck(text);
        if (titelOderZweck is null)
        {
            fehlendeAngaben.Add("Titel oder Zweck");
        }

        var datum = ErmittleDatum(text, unsichereAngaben);
        if (!datum.HasValue)
        {
            fehlendeAngaben.Add("Datum");
        }

        var (beginn, ende, dauerMinuten) = ErmittleZeit(text, fehlendeAngaben, unsichereAngaben);

        var aktiveRaeume = await datenbank.Raeume
            .AsNoTracking()
            .Where(raum => raum.Aktiv)
            .OrderBy(raum => raum.Id)
            .ToListAsync(cancellationToken);
        var passendeRaeume = aktiveRaeume
            .Where(raum => EnthaeltBegriff(text, Normalisiere(raum.Name)))
            .ToList();

        BuchungsEntwurfRessource? raumEntwurf = null;
        if (passendeRaeume.Count == 1)
        {
            var raum = passendeRaeume[0];
            raumEntwurf = new BuchungsEntwurfRessource(raum.Id, raum.Name);
        }
        else
        {
            fehlendeAngaben.Add("Raum");
            if (passendeRaeume.Count > 1)
            {
                unsichereAngaben.Add("Mehrere aktive Räume passen zum Text; der Raum wurde nicht zugeordnet.");
            }
            else
            {
                var raumErwaehnung = RaumErwaehnungMuster.Match(text);
                if (raumErwaehnung.Success)
                {
                    unsichereAngaben.Add($"Der Raum „{raumErwaehnung.Groups["name"].Value.Trim()}“ konnte keinem aktiven Raum sicher zugeordnet werden.");
                }
            }
        }

        var aktiveGeraete = await datenbank.Medizingeraete
            .AsNoTracking()
            .Where(geraet => geraet.Aktiv)
            .OrderBy(geraet => geraet.Id)
            .ToListAsync(cancellationToken);
        var passendeGeraete = aktiveGeraete
            .Where(geraet => GeraetBegriffPasst(text, geraet.Name))
            .ToList();

        var medizingeraete = new List<BuchungsEntwurfRessource>();
        if (passendeGeraete.Count == 1)
        {
            var geraet = passendeGeraete[0];
            medizingeraete.Add(new BuchungsEntwurfRessource(geraet.Id, geraet.Name));
        }
        else if (passendeGeraete.Count > 1)
        {
            fehlendeAngaben.Add("Medizingeraet");
            unsichereAngaben.Add("Mehrere aktive Medizingeräte passen zum Text; es wurde keines zugeordnet.");
        }
        else
        {
            var geraeteErwaehnung = GeraeteErwaehnungMuster.Match(text);
            if (geraeteErwaehnung.Success)
            {
                fehlendeAngaben.Add("Medizingeraet");
                unsichereAngaben.Add($"Das Medizingerät „{geraeteErwaehnung.Groups["name"].Value.Trim()}“ konnte keinem aktiven Gerät sicher zugeordnet werden.");
            }
        }

        return new BuchungsEntwurf
        {
            TitelOderZweck = titelOderZweck,
            Datum = datum,
            Beginn = beginn,
            Ende = ende,
            DauerMinuten = dauerMinuten,
            Raum = raumEntwurf,
            Medizingeraete = medizingeraete,
            FehlendeAngaben = fehlendeAngaben.Distinct().ToArray(),
            UnsichereAngaben = unsichereAngaben
        };
    }

    private DateOnly? ErmittleDatum(string text, ICollection<string> unsichereAngaben)
    {
        var datumMuster = DeutschesDatumMuster.Match(text);
        var isoMuster = IsoDatumMuster.Match(text);
        var relativeHeute = Regex.IsMatch(text, @"\bheute\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        var relativeMorgen = Regex.IsMatch(text, @"\bmorgen\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        var erkannteDatumsangaben = (datumMuster.Success ? 1 : 0) + (isoMuster.Success ? 1 : 0) + (relativeHeute ? 1 : 0) + (relativeMorgen ? 1 : 0);

        if (erkannteDatumsangaben > 1)
        {
            unsichereAngaben.Add("Mehrere Datumsangaben erkannt; das Datum wurde nicht zugeordnet.");
            return null;
        }

        if (relativeHeute || relativeMorgen)
        {
            var heute = DateOnly.FromDateTime(zeitProvider.GetLocalNow().DateTime);
            return relativeMorgen ? heute.AddDays(1) : heute;
        }

        if (datumMuster.Success && DateOnly.TryParseExact(
                datumMuster.Value,
                "dd.MM.yyyy",
                CultureInfo.GetCultureInfo("de-DE"),
                DateTimeStyles.None,
                out var deutschesDatum))
        {
            return deutschesDatum;
        }

        if (isoMuster.Success && DateOnly.TryParseExact(
                isoMuster.Value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var isoDatum))
        {
            return isoDatum;
        }

        if (Regex.IsMatch(text, @"\b(?:übermorgen|uebermorgen|nächsten|naechsten|kommenden)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            unsichereAngaben.Add("Die relative Datumsangabe wird nicht unterstützt.");
        }

        return null;
    }

    private static (TimeOnly? Beginn, TimeOnly? Ende, int? DauerMinuten) ErmittleZeit(
        string text,
        ICollection<string> fehlendeAngaben,
        ICollection<string> unsichereAngaben)
    {
        var zeitspanne = ZeitspanneMuster.Match(text);
        if (zeitspanne.Success)
        {
            if (TryParseZeit(zeitspanne.Groups["beginn"].Value, out var beginn) &&
                TryParseZeit(zeitspanne.Groups["ende"].Value, out var ende) &&
                ende > beginn)
            {
                return (beginn, ende, (int)(ende - beginn).TotalMinutes);
            }

            unsichereAngaben.Add("Die erkannte Zeitspanne ist ungültig oder endet nicht nach ihrem Beginn.");
            fehlendeAngaben.Add("Beginn");
            fehlendeAngaben.Add("Ende");
            return (null, null, null);
        }

        var beginnMuster = BeginnMuster.Match(text);
        var dauerMuster = DauerMuster.Match(text);
        TimeOnly? erkannterBeginn = TryParseZeit(beginnMuster.Groups["beginn"].Value, out var zeit)
            ? zeit
            : null;
        var dauerMinuten = ErmittleDauer(dauerMuster);

        if (erkannterBeginn.HasValue && dauerMinuten.HasValue)
        {
            var ende = erkannterBeginn.Value.AddMinutes(dauerMinuten.Value);
            return ende > erkannterBeginn.Value
                ? (erkannterBeginn, ende, dauerMinuten)
                : (erkannterBeginn, null, dauerMinuten);
        }

        if (!erkannterBeginn.HasValue) fehlendeAngaben.Add("Beginn");
        if (!dauerMinuten.HasValue) fehlendeAngaben.Add("Ende");
        return (erkannterBeginn, null, dauerMinuten);
    }

    private static int? ErmittleDauer(Match muster)
    {
        if (!muster.Success || !int.TryParse(muster.Groups["dauer"].Value, out var wert) || wert <= 0)
        {
            return null;
        }

        return muster.Groups["einheit"].Value.StartsWith("stunde", StringComparison.OrdinalIgnoreCase)
            ? wert * 60
            : wert;
    }

    private static string? ErmittleZweck(string text)
    {
        var treffer = ZweckMuster.Match(text);
        return treffer.Success && !string.IsNullOrWhiteSpace(treffer.Groups["zweck"].Value)
            ? treffer.Groups["zweck"].Value.Trim()
            : null;
    }

    private static bool GeraetBegriffPasst(string text, string geraetename)
    {
        var name = Normalisiere(geraetename);
        if (EnthaeltBegriff(text, name)) return true;

        const string geraeteSuffix = "geraet";
        return name.EndsWith(geraeteSuffix, StringComparison.Ordinal) &&
               name.Length > geraeteSuffix.Length &&
               EnthaeltBegriff(text, name[..^geraeteSuffix.Length]);
    }

    private static bool EnthaeltBegriff(string text, string begriff)
    {
        return begriff.Length > 0 && Normalisiere(text).Contains(begriff, StringComparison.Ordinal);
    }

    private static string Normalisiere(string text)
    {
        var zerlegt = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(zerlegt.Length);
        foreach (var zeichen in zerlegt)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(zeichen) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(zeichen)) builder.Append(char.ToLowerInvariant(zeichen));
        }

        return builder.ToString();
    }

    private static bool TryParseZeit(string text, out TimeOnly zeit)
    {
        if (!text.Contains(':'))
        {
            if (int.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var stunde) && stunde is >= 0 and <= 23)
            {
                zeit = new TimeOnly(stunde, 0);
                return true;
            }

            zeit = default;
            return false;
        }

        return TimeOnly.TryParseExact(
            text,
            ["H:mm", "HH:mm"],
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out zeit);
    }
}