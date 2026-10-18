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
    // Eine Uhrzeit ist numerisch („12“, „10:30“) oder eine ausgeschriebene volle Stunde („zwölf“).
    private static readonly string UhrzeitMuster = $@"(?:\d{{1,2}}(?::\d{{2}})?|{AusgeschriebeneStunden.Muster})";

    private static readonly Regex ZeitspanneMuster = new(
        $@"(?:\bvon\s*)?(?<beginn>{UhrzeitMuster})\s*(?:uhr)?\s*(?:bis|[-–])\s*(?<ende>{UhrzeitMuster})\s*(?:uhr)?\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex BeginnMuster = new(
        $@"\b(?:um|von)\s+(?<beginn>{UhrzeitMuster})\s*uhr\b",
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

    // „25. Oktober 2026“, „25. Oktober“, „25.Oktober“
    private static readonly Regex MonatsnameDatumMuster = new(
        $@"\b(?<tag>\d{{1,2}})(?:\.\s*|\s+)(?<monat>{string.Join("|", Datumsangaben.MonatNachName.Keys)})(?:\s+(?<jahr>\d{{4}}))?\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    // „in 2 Tagen“, „in einer Woche“, „in drei Monaten“; die Anzahl darf aus bis zu zwei Wörtern bestehen,
    // damit auch nicht unterstützte Angaben wie „in ein paar Tagen“ erkannt und als unsicher gemeldet werden.
    private static readonly Regex RelativesDatumMuster = new(
        @"\bin\s+(?<anzahl>[\p{L}\d]+(?:\s+\p{L}+)??)\s+(?<einheit>tag(?:e|en)?|woche(?:n)?|monat(?:e|en)?)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

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
        var heute = DateOnly.FromDateTime(zeitProvider.GetLocalNow().DateTime);
        var kandidaten = new List<Datumskandidat>();

        if (Regex.IsMatch(text, @"\bheute\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            kandidaten.Add(new(heute, null));
        }

        if (Regex.IsMatch(text, @"\bmorgen\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            kandidaten.Add(new(heute.AddDays(1), null));
        }

        if (Regex.IsMatch(text, @"\b(?:übermorgen|uebermorgen)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            kandidaten.Add(new(heute.AddDays(2), null));
        }

        foreach (Match relativ in RelativesDatumMuster.Matches(text))
        {
            kandidaten.Add(Datumsangaben.TryHoleAnzahl(relativ.Groups["anzahl"].Value, out var anzahl)
                ? new(Datumsangaben.Verschiebe(heute, anzahl, relativ.Groups["einheit"].Value), null)
                : new(null, $"Die relative Datumsangabe „{relativ.Value}“ wird nicht unterstützt; das Datum wurde nicht zugeordnet."));
        }

        foreach (Match deutsch in DeutschesDatumMuster.Matches(text))
        {
            kandidaten.Add(DateOnly.TryParseExact(
                    deutsch.Value,
                    ["d.M.yyyy", "dd.MM.yyyy"],
                    CultureInfo.GetCultureInfo("de-DE"),
                    DateTimeStyles.None,
                    out var deutschesDatum)
                ? new(deutschesDatum, null)
                : Ungueltig(deutsch.Value));
        }

        foreach (Match iso in IsoDatumMuster.Matches(text))
        {
            kandidaten.Add(DateOnly.TryParseExact(
                    iso.Value,
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var isoDatum)
                ? new(isoDatum, null)
                : Ungueltig(iso.Value));
        }

        foreach (Match monatsname in MonatsnameDatumMuster.Matches(text))
        {
            var tag = int.Parse(monatsname.Groups["tag"].Value, CultureInfo.InvariantCulture);
            var monat = Datumsangaben.MonatNachName[monatsname.Groups["monat"].Value];
            var jahr = monatsname.Groups["jahr"].Success
                ? int.Parse(monatsname.Groups["jahr"].Value, CultureInfo.InvariantCulture)
                : Datumsangaben.NaechstesJahrFuer(heute, monat, tag);
            kandidaten.Add(Datumsangaben.TryErstelle(jahr, monat, tag, out var datum)
                ? new(datum, null)
                : Ungueltig(monatsname.Value));
        }

        if (kandidaten.Count > 1)
        {
            unsichereAngaben.Add("Mehrere Datumsangaben erkannt; das Datum wurde nicht zugeordnet.");
            return null;
        }

        if (kandidaten.Count == 1)
        {
            var kandidat = kandidaten[0];
            if (kandidat.Problem is not null)
            {
                unsichereAngaben.Add(kandidat.Problem);
            }

            return kandidat.Datum;
        }

        if (Regex.IsMatch(text, @"\b(?:nächsten|naechsten|kommenden)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            unsichereAngaben.Add("Die relative Datumsangabe wird nicht unterstützt.");
        }

        return null;

        static Datumskandidat Ungueltig(string wert) =>
            new(null, $"Das Datum „{wert}“ ist ungültig; das Datum wurde nicht zugeordnet.");
    }

    /// <summary>Eine erkannte Datumsangabe: entweder ein gültiges Datum oder der Grund, warum keines übernommen wird.</summary>
    private readonly record struct Datumskandidat(DateOnly? Datum, string? Problem);

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

        // „gerät“ wird durch Normalisiere zu „gerat“, „geraet“ bleibt erhalten.
        foreach (var geraeteSuffix in new[] { "geraet", "gerat" })
        {
            if (name.EndsWith(geraeteSuffix, StringComparison.Ordinal) &&
                name.Length > geraeteSuffix.Length &&
                EnthaeltBegriff(text, name[..^geraeteSuffix.Length]))
            {
                return true;
            }
        }

        return false;
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
        if (AusgeschriebeneStunden.TryHoleStunde(text, out var ausgeschriebeneStunde))
        {
            zeit = new TimeOnly(ausgeschriebeneStunde, 0);
            return true;
        }

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

    /// <summary>Hilfslogik für Monatsnamen, relative Datumsangaben und Datumsangaben ohne Jahr.</summary>
    private static class Datumsangaben
    {
        public static readonly Dictionary<string, int> MonatNachName = new(StringComparer.OrdinalIgnoreCase)
        {
            ["januar"] = 1,
            ["jänner"] = 1,
            ["februar"] = 2,
            ["märz"] = 3,
            ["maerz"] = 3,
            ["april"] = 4,
            ["mai"] = 5,
            ["juni"] = 6,
            ["juli"] = 7,
            ["august"] = 8,
            ["september"] = 9,
            ["oktober"] = 10,
            ["november"] = 11,
            ["dezember"] = 12,
        };

        private static readonly Dictionary<string, int> AnzahlNachWort = new(StringComparer.OrdinalIgnoreCase)
        {
            ["ein"] = 1,
            ["eine"] = 1,
            ["einem"] = 1,
            ["einer"] = 1,
            ["eins"] = 1,
            ["zwei"] = 2,
            ["drei"] = 3,
            ["vier"] = 4,
            ["fünf"] = 5,
            ["fuenf"] = 5,
            ["sechs"] = 6,
            ["sieben"] = 7,
            ["acht"] = 8,
            ["neun"] = 9,
            ["zehn"] = 10,
            ["elf"] = 11,
            ["zwölf"] = 12,
            ["zwoelf"] = 12,
        };

        /// <summary>Liest „2“ oder „zwei“; alles andere (z. B. „ein paar“) gilt als nicht unterstützt.</summary>
        public static bool TryHoleAnzahl(string wert, out int anzahl)
        {
            if (int.TryParse(wert, NumberStyles.None, CultureInfo.InvariantCulture, out anzahl))
            {
                return anzahl > 0;
            }

            return AnzahlNachWort.TryGetValue(wert, out anzahl);
        }

        public static DateOnly Verschiebe(DateOnly heute, int anzahl, string einheit) =>
            einheit.StartsWith("tag", StringComparison.OrdinalIgnoreCase) ? heute.AddDays(anzahl)
            : einheit.StartsWith("woche", StringComparison.OrdinalIgnoreCase) ? heute.AddDays(anzahl * 7)
            : heute.AddMonths(anzahl);

        /// <summary>Ohne Jahr: aktuelles Jahr, solange der Tag noch bevorsteht (heute eingeschlossen), sonst das nächste Jahr.</summary>
        public static int NaechstesJahrFuer(DateOnly heute, int monat, int tag) =>
            (monat, tag).CompareTo((heute.Month, heute.Day)) >= 0 ? heute.Year : heute.Year + 1;

        public static bool TryErstelle(int jahr, int monat, int tag, out DateOnly datum)
        {
            var gueltig = jahr is >= 1 and <= 9999 && monat is >= 1 and <= 12 && tag >= 1 && tag <= DateTime.DaysInMonth(jahr, monat);
            datum = gueltig ? new DateOnly(jahr, monat, tag) : default;
            return gueltig;
        }
    }

    /// <summary>
    /// Ausgeschriebene volle Stunden von „null“ bis „dreiundzwanzig“, z. B. aus der Spracherkennung.
    /// Umgangssprachliche Angaben wie „halb zehn“ oder „Viertel nach zehn“ werden bewusst nicht unterstützt.
    /// </summary>
    private static class AusgeschriebeneStunden
    {
        private static readonly Dictionary<string, int> StundeNachWort = new(StringComparer.OrdinalIgnoreCase)
        {
            ["null"] = 0,
            ["ein"] = 1,
            ["eins"] = 1,
            ["zwei"] = 2,
            ["drei"] = 3,
            ["vier"] = 4,
            ["fünf"] = 5,
            ["fuenf"] = 5,
            ["sechs"] = 6,
            ["sieben"] = 7,
            ["acht"] = 8,
            ["neun"] = 9,
            ["zehn"] = 10,
            ["elf"] = 11,
            ["zwölf"] = 12,
            ["zwoelf"] = 12,
            ["dreizehn"] = 13,
            ["vierzehn"] = 14,
            ["fünfzehn"] = 15,
            ["fuenfzehn"] = 15,
            ["sechzehn"] = 16,
            ["siebzehn"] = 17,
            ["achtzehn"] = 18,
            ["neunzehn"] = 19,
            ["zwanzig"] = 20,
            ["einundzwanzig"] = 21,
            ["zweiundzwanzig"] = 22,
            ["dreiundzwanzig"] = 23,
        };

        /// <summary>Regex-Alternative aller Stundenwörter, längste zuerst („dreizehn“ vor „drei“).</summary>
        public static readonly string Muster = $@"\b(?:{string.Join("|", StundeNachWort.Keys.OrderByDescending(wort => wort.Length).Select(Regex.Escape))})\b";

        public static bool TryHoleStunde(string wort, out int stunde) => StundeNachWort.TryGetValue(wort.Trim(), out stunde);
    }
}