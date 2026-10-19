import type { Buchung } from '../../types/api'

export type Kalenderansicht = 'tag' | 'woche' | 'monat'

/** Halboffener Zeitraum: `von` gehört dazu, `bis` nicht. */
export type Zeitraum = { von: Date; bis: Date }

/** Der Teil einer Buchung, der in einen Zeitraum fällt. */
export type Abschnitt = {
  buchung: Buchung
  von: Date
  bis: Date
  /** Die Buchung beginnt vor dem Zeitraum (z. B. am Vortag). */
  beginntVorher: boolean
  /** Die Buchung endet nach dem Zeitraum (z. B. am Folgetag). */
  endetDanach: boolean
}

/**
 * Abschnitt mit Spalte innerhalb einer Gruppe sich überschneidender Buchungen;
 * `spanne` ist die Anzahl Spalten, über die er sich ausdehnen darf, ohne andere zu verdecken.
 */
export type PlatzierterAbschnitt = Abschnitt & { spalte: number; spalten: number; spanne: number }

export const minutenProTag = 24 * 60

// ---------- Kalendergrenzen (lokale Zeit; über Kalenderdaten statt fester Millisekunden, damit Zeitumstellungen stimmen) ----------

export function tagesbeginn(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate())
}

/** Beginn des Tages, der `anzahl` Tage nach `datum` liegt. */
export function plusTage(datum: Date, anzahl: number): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() + anzahl)
}

/** Montag der Woche, in der `datum` liegt. */
export function wochenbeginn(datum: Date): Date {
  const tag = tagesbeginn(datum)
  return plusTage(tag, -((tag.getDay() + 6) % 7))
}

export function monatsbeginn(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), 1)
}

export function istGleicherTag(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function zeitraumFuer(ansicht: Kalenderansicht, datum: Date): Zeitraum {
  if (ansicht === 'tag') {
    const von = tagesbeginn(datum)
    return { von, bis: plusTage(von, 1) }
  }
  if (ansicht === 'woche') {
    const von = wochenbeginn(datum)
    return { von, bis: plusTage(von, 7) }
  }
  const von = monatsbeginn(datum)
  return { von, bis: new Date(von.getFullYear(), von.getMonth() + 1, 1) }
}

/** Nächster bzw. vorheriger Zeitraum; im Monatsschritt bleibt der Tag erhalten, soweit es ihn im Zielmonat gibt. */
export function verschiebe(ansicht: Kalenderansicht, datum: Date, schritt: -1 | 1): Date {
  if (ansicht === 'tag') return plusTage(datum, schritt)
  if (ansicht === 'woche') return plusTage(datum, 7 * schritt)
  const zielmonat = new Date(datum.getFullYear(), datum.getMonth() + schritt, 1)
  const letzterTag = new Date(zielmonat.getFullYear(), zielmonat.getMonth() + 1, 0).getDate()
  return new Date(zielmonat.getFullYear(), zielmonat.getMonth(), Math.min(datum.getDate(), letzterTag))
}

/** Alle Tagesanfänge innerhalb eines Zeitraums. */
export function tageIm(zeitraum: Zeitraum): Date[] {
  const tage: Date[] = []
  for (let tag = tagesbeginn(zeitraum.von); tag < zeitraum.bis; tag = plusTage(tag, 1)) tage.push(tag)
  return tage
}

// ---------- Buchungen im Kalender ----------

/** Jede Buchung genau einmal, erkannt an ihrer ID. */
export function eindeutigeBuchungen(buchungen: Buchung[]): Buchung[] {
  return [...new Map(buchungen.map((buchung) => [buchung.id, buchung])).values()]
}

/**
 * Buchungen, die sich mit dem Zeitraum überschneiden, jeweils auf den Zeitraum zugeschnitten.
 * Die API liefert Zeitstempel mit Offset; `new Date()` rechnet sie genau einmal in die lokale Zeit um.
 */
export function abschnitteIm(buchungen: Buchung[], zeitraum: Zeitraum): Abschnitt[] {
  const abschnitte: Abschnitt[] = []
  for (const buchung of buchungen) {
    const beginn = new Date(buchung.beginn)
    const ende = new Date(buchung.ende)
    if (beginn < zeitraum.bis && ende > zeitraum.von) {
      abschnitte.push({
        buchung,
        von: beginn < zeitraum.von ? zeitraum.von : beginn,
        bis: ende > zeitraum.bis ? zeitraum.bis : ende,
        beginntVorher: beginn < zeitraum.von,
        endetDanach: ende > zeitraum.bis,
      })
    }
  }
  return abschnitte.sort((a, b) => a.von.getTime() - b.von.getTime() || b.bis.getTime() - a.bis.getTime() || a.buchung.id - b.buchung.id)
}

const ueberschneiden = (a: Abschnitt, b: Abschnitt) => a.von < b.bis && b.von < a.bis

/**
 * Verteilt sich überschneidende Abschnitte eines Tages auf Spalten (wie in Teams/Outlook):
 * Jede Gruppe zusammenhängender Überschneidungen teilt sich die Breite; ein Abschnitt dehnt sich
 * nach rechts in Spalten aus, die während seiner Dauer frei sind.
 */
export function inSpalten(abschnitte: Abschnitt[]): PlatzierterAbschnitt[] {
  const ergebnis: PlatzierterAbschnitt[] = []
  let gruppe: PlatzierterAbschnitt[] = []
  let spaltenEnden: number[] = []
  let gruppenEnde = -Infinity

  const gruppeAbschliessen = () => {
    for (const eintrag of gruppe) {
      eintrag.spalten = spaltenEnden.length
      while (
        eintrag.spalte + eintrag.spanne < eintrag.spalten
        && !gruppe.some((andere) => andere.spalte === eintrag.spalte + eintrag.spanne && ueberschneiden(andere, eintrag))
      ) eintrag.spanne++
    }
    ergebnis.push(...gruppe)
    gruppe = []
    spaltenEnden = []
  }

  for (const abschnitt of abschnitte) {
    const von = abschnitt.von.getTime()
    const bis = abschnitt.bis.getTime()
    if (von >= gruppenEnde) gruppeAbschliessen()
    let spalte = spaltenEnden.findIndex((ende) => ende <= von)
    if (spalte === -1) {
      spalte = spaltenEnden.length
      spaltenEnden.push(bis)
    } else {
      spaltenEnden[spalte] = bis
    }
    gruppe.push({ ...abschnitt, spalte, spalten: 1, spanne: 1 })
    gruppenEnde = gruppe.length === 1 ? bis : Math.max(gruppenEnde, bis)
  }
  gruppeAbschliessen()
  return ergebnis
}

/**
 * Lage im Tagesraster in Minuten. Der Beginn richtet sich nach der Uhrzeit (passend zur Stundenskala),
 * die Höhe nach der tatsächlichen Dauer – so stimmen beide auch an Tagen mit Zeitumstellung.
 */
export function rasterLage(abschnitt: Abschnitt): { oben: number; hoehe: number } {
  const oben = abschnitt.beginntVorher ? 0 : abschnitt.von.getHours() * 60 + abschnitt.von.getMinutes() + abschnitt.von.getSeconds() / 60
  const dauer = (abschnitt.bis.getTime() - abschnitt.von.getTime()) / 60_000
  const hoehe = abschnitt.endetDanach ? minutenProTag - oben : Math.min(dauer, minutenProTag - oben)
  return { oben, hoehe: Math.max(hoehe, 0) }
}

// ---------- Formatierung ----------

export function formatiereDauer(minuten: number): string {
  if (minuten < 60) return `${minuten} Min.`
  const stunden = Math.floor(minuten / 60)
  const rest = minuten % 60
  return rest === 0 ? `${stunden} Std.` : `${stunden} Std. ${rest} Min.`
}

const uhrzeit = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
export function formatiereUhrzeit(datum: Date): string {
  return uhrzeit.format(datum)
}

const datumKurz = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
export function formatiereDatum(datum: Date): string {
  return datumKurz.format(datum)
}

/** Datum und Uhrzeiten einer Buchung; mehrtägige Buchungen nennen beide Daten. */
export function buchungszeit(buchung: Buchung): { datum: string; zeit: string; minuten: number } {
  const beginn = new Date(buchung.beginn)
  const ende = new Date(buchung.ende)
  const minuten = Math.round((ende.getTime() - beginn.getTime()) / 60_000)
  if (istGleicherTag(beginn, ende)) {
    return { datum: formatiereDatum(beginn), zeit: `${formatiereUhrzeit(beginn)}–${formatiereUhrzeit(ende)}`, minuten }
  }
  return {
    datum: `${formatiereDatum(beginn)} – ${formatiereDatum(ende)}`,
    zeit: `${formatiereUhrzeit(beginn)} – ${formatiereUhrzeit(ende)}`,
    minuten,
  }
}

export function geraetenamenVon(buchung: Buchung, geraetenamen: Map<number, string>): string[] {
  return buchung.medizingeraetIds.map((id) => geraetenamen.get(id) ?? `Gerät ${id}`)
}

/** Vollständige Beschreibung für Screenreader. */
export function buchungsbeschreibung(buchung: Buchung, geraetenamen: Map<number, string>): string {
  const { datum, zeit, minuten } = buchungszeit(buchung)
  const geraete = geraetenamenVon(buchung, geraetenamen)
  return [
    buchung.titel,
    `${datum}, ${zeit} (${formatiereDauer(minuten)})`,
    `Raum: ${buchung.raumName}`,
    geraete.length > 0 ? `Medizingeräte: ${geraete.join(', ')}` : 'Keine Medizingeräte',
  ].join('; ')
}

/** Kalenderwoche nach ISO 8601. */
export function kalenderwoche(datum: Date): number {
  const donnerstag = plusTage(wochenbeginn(datum), 3)
  const jahresbeginn = new Date(donnerstag.getFullYear(), 0, 1)
  // Runden gleicht die Stunde aus, die durch Zeitumstellungen zwischen den beiden Tagen liegen kann.
  const tage = Math.round((donnerstag.getTime() - jahresbeginn.getTime()) / 86_400_000)
  return Math.floor(tage / 7) + 1
}
