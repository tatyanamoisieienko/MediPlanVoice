namespace MediPlanVoice.Api.Services;

/// <summary>Audioformate, die an die Spracherkennung weitergegeben werden dürfen.</summary>
public static class Audioformate
{
    private static readonly Dictionary<string, string> DateiendungNachInhaltstyp = new(StringComparer.OrdinalIgnoreCase)
    {
        ["audio/webm"] = "webm",
        ["audio/ogg"] = "ogg",
        ["audio/wav"] = "wav",
        ["audio/x-wav"] = "wav",
        ["audio/wave"] = "wav",
        ["audio/mpeg"] = "mp3",
        ["audio/mp4"] = "m4a",
        ["audio/x-m4a"] = "m4a",
    };

    /// <summary>Entfernt Parameter wie <c>;codecs=opus</c> und liefert den reinen Medientyp.</summary>
    public static string Normalisiere(string? inhaltstyp) =>
        (inhaltstyp ?? string.Empty).Split(';', 2)[0].Trim().ToLowerInvariant();

    public static bool IstUnterstuetzt(string? inhaltstyp) =>
        DateiendungNachInhaltstyp.ContainsKey(Normalisiere(inhaltstyp));

    public static string Dateiendung(string inhaltstyp) =>
        DateiendungNachInhaltstyp.TryGetValue(Normalisiere(inhaltstyp), out var endung) ? endung : "bin";
}
